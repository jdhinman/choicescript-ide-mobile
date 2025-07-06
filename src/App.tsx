import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import RNFS from 'react-native-fs';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface OpenFile {
  name: string;
  path: string;
  content: string;
  modified: boolean;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentDirectory, setCurrentDirectory] = useState<string>(RNFS.DocumentDirectoryPath);

  useEffect(() => {
    loadDirectory(currentDirectory);
    // Create initial ChoiceScript project
    createSampleProject();
  }, [currentDirectory]);

  const createSampleProject = async () => {
    try {
      const projectPath = `${RNFS.DocumentDirectoryPath}/MyChoiceScriptGame`;
      const projectExists = await RNFS.exists(projectPath);
      
      if (!projectExists) {
        await RNFS.mkdir(projectPath);
        
        // Create startup.txt
        const startupContent = `*title My First ChoiceScript Game
*author Your Name

Welcome to your first ChoiceScript game!

This is the beginning of your interactive story. What would you like to do?

*choice
  #Explore the mysterious forest
    You venture into the dark forest, leaves crunching under your feet.
    *goto forest_scene
  #Visit the bustling marketplace
    You head towards the crowded marketplace, full of interesting sights and sounds.
    *goto market_scene
  #Return home to rest
    You decide to go back home and rest for the day.
    *finish

*label forest_scene
You find yourself deep in the mysterious forest. Ancient trees tower above you.

*choice
  #Climb a tall tree
    You carefully climb up the oak tree and get a bird's eye view of the area.
    *finish
  #Follow a winding path
    The path leads you to a hidden clearing with a beautiful pond.
    *finish

*label market_scene
The marketplace buzzes with activity. Merchants call out their wares.

*choice
  #Buy some food
    You purchase fresh bread and fruit from a friendly vendor.
    *finish
  #Listen to the town crier
    You learn interesting news about the kingdom.
    *finish`;

        await RNFS.writeFile(`${projectPath}/startup.txt`, startupContent, 'utf8');
        
        // Create choicescript_stats.txt
        const statsContent = `*comment This file contains the variable definitions for your game.

*create strength 50
*create intelligence 50
*create charisma 50

*comment You can add more variables here as needed for your story.`;

        await RNFS.writeFile(`${projectPath}/choicescript_stats.txt`, statsContent, 'utf8');
        
        console.log('Sample project created successfully');
      }
    } catch (error) {
      console.error('Error creating sample project:', error);
    }
  };

  const loadDirectory = async (path: string) => {
    try {
      const items = await RNFS.readDir(path);
      const fileItems: FileItem[] = items.map(item => ({
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory(),
      }));
      setFiles(fileItems);
    } catch (error) {
      console.error('Error loading directory:', error);
      Alert.alert('Error', 'Failed to load directory');
    }
  };

  const openFile = async (filePath: string, fileName: string) => {
    try {
      if (fileName.endsWith('.txt')) {
        const content = await RNFS.readFile(filePath, 'utf8');
        const newFile: OpenFile = {
          name: fileName,
          path: filePath,
          content,
          modified: false,
        };
        
        setOpenFiles(prev => {
          const exists = prev.find(f => f.path === filePath);
          if (exists) return prev;
          return [...prev, newFile];
        });
        
        setActiveFile(filePath);
        setCurrentContent(content);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const saveFile = async (filePath: string, content: string) => {
    try {
      await RNFS.writeFile(filePath, content, 'utf8');
      setOpenFiles(prev =>
        prev.map(file =>
          file.path === filePath
            ? {...file, content, modified: false}
            : file
        )
      );
      Alert.alert('Success', 'File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save file');
    }
  };

  const closeFile = (filePath: string) => {
    setOpenFiles(prev => prev.filter(f => f.path !== filePath));
    if (activeFile === filePath) {
      const remaining = openFiles.filter(f => f.path !== filePath);
      if (remaining.length > 0) {
        setActiveFile(remaining[0].path);
        setCurrentContent(remaining[0].content);
      } else {
        setActiveFile(null);
        setCurrentContent('');
      }
    }
  };

  const handleContentChange = (text: string) => {
    setCurrentContent(text);
    if (activeFile) {
      setOpenFiles(prev =>
        prev.map(file =>
          file.path === activeFile
            ? {...file, content: text, modified: true}
            : file
        )
      );
    }
  };

  const renderFileItem = ({item}: {item: FileItem}) => (
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => {
        if (item.isDirectory) {
          setCurrentDirectory(item.path);
        } else {
          openFile(item.path, item.name);
        }
      }}>
      <Text style={[styles.fileName, item.isDirectory && styles.directoryName]}>
        {item.isDirectory ? '📁 ' : '📄 '}{item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderTabItem = ({item}: {item: OpenFile}) => (
    <TouchableOpacity
      style={[styles.tab, activeFile === item.path && styles.activeTab]}
      onPress={() => {
        setActiveFile(item.path);
        setCurrentContent(item.content);
      }}>
      <Text style={styles.tabText}>{item.name}</Text>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => closeFile(item.path)}>
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChoiceScript IDE</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => activeFile && saveFile(activeFile, currentContent)}>
          <Text style={styles.headerButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* File Explorer */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Project Explorer</Text>
            <TouchableOpacity
              onPress={() => setCurrentDirectory(RNFS.DocumentDirectoryPath)}>
              <Text style={styles.homeButton}>🏠</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={files}
            renderItem={renderFileItem}
            keyExtractor={item => item.path}
            style={styles.fileList}
          />
        </View>

        {/* Editor Area */}
        <View style={styles.editorArea}>
          {/* Tabs */}
          {openFiles.length > 0 && (
            <View style={styles.tabBar}>
              <FlatList
                data={openFiles}
                renderItem={renderTabItem}
                keyExtractor={item => item.path}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Editor */}
          <View style={styles.editorContainer}>
            {activeFile ? (
              <TextInput
                style={styles.editor}
                value={currentContent}
                onChangeText={handleContentChange}
                multiline
                placeholder="Start writing your ChoiceScript story..."
                placeholderTextColor="#666"
                textAlignVertical="top"
              />
            ) : (
              <View style={styles.welcomeScreen}>
                <Text style={styles.welcomeTitle}>Welcome to ChoiceScript IDE</Text>
                <Text style={styles.welcomeText}>
                  Open a .txt file from the project explorer to start editing your interactive story.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    backgroundColor: '#007acc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  headerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#252525',
    borderRightWidth: 1,
    borderRightColor: '#444',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  homeButton: {
    fontSize: 18,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
  },
  directoryName: {
    color: '#87ceeb',
  },
  editorArea: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#444',
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    color: '#fff',
    fontSize: 12,
    marginRight: 8,
  },
  closeButton: {
    padding: 2,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editorContainer: {
    flex: 1,
  },
  editor: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
    padding: 16,
    textAlignVertical: 'top',
  },
  welcomeScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default App;