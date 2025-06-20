import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import * as SQLite from 'expo-sqlite';

let db = null;

export const setupDatabase = async () => {
  db = await SQLite.openDatabaseAsync('items.db');
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    );`
  );
};

const checkForDuplicate = async (name) => {
  const results = await db.getAllAsync('SELECT id FROM items WHERE name = ?;', [name]);
  return results.length > 0;
};

export default function App() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    setupDatabase().then(fetchItems);
  }, []);

  const fetchItems = async () => {
    if (!db) return;
    const results = await db.getAllAsync('SELECT id, name FROM items;');
    setItems(results.map((row, index) => ({ id: row.id, name: row.name, index: index + 1 })));
  };

  const addItem = async () => {
    const trimmedText = text.trim();
    if (db === null || trimmedText === '') {
      Alert.alert('Error', 'Item name cannot be empty!');
      return;
    }

    const isDuplicate = await checkForDuplicate(trimmedText);
    if (isDuplicate) {
      Alert.alert('Error', 'This item already exists!');
      return;
    }

    await db.runAsync('INSERT INTO items (name) VALUES (?);', [trimmedText]);
    setText('');
    fetchItems();
  };

  const editItem = (item) => {
    setText(item.name);
    setEditingItem(item);
  };

  const updateItem = async () => {
    const trimmedText = text.trim();
    if (db === null || !editingItem || trimmedText === '') {
      Alert.alert('Error', 'Item name cannot be empty!');
      return;
    }

    if (trimmedText !== editingItem.name) {
      const isDuplicate = await checkForDuplicate(trimmedText);
      if (isDuplicate) {
        Alert.alert('Error', 'This item already exists!');
        return;
      }
    }

    await db.runAsync('UPDATE items SET name = ? WHERE id = ?;', [trimmedText, editingItem.id]);
    setText('');
    setEditingItem(null);
    fetchItems();
  };

  const confirmDeleteItem = (id) => {
    if (editingItem) {
      Alert.alert('Action Blocked', 'You cannot delete items while updating one.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (db === null) return;
            await db.runAsync('DELETE FROM items WHERE id = ?;', [id]);
            fetchItems();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Enter movie"
        value={text}
        onChangeText={setText}
        style={styles.input}
      />
      <Button
        title={editingItem ? 'Update Item' : 'Add movie'}
        onPress={editingItem ? updateItem : addItem}
      />

      {/* Table Header */}
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, styles.indexColumn]}>#</Text>
        <Text style={[styles.cell, styles.nameColumn]}>Movie Name</Text>
        <Text style={[styles.cell, styles.actionColumn]}>Actions</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, styles.indexColumn]}>{item.index}</Text>
            <Text style={[styles.cell, styles.nameColumn]}>{item.name}</Text>
            <View style={[styles.cell, styles.actionColumn, { flexDirection: 'row' }]}>
              <TouchableOpacity onPress={() => editItem(item)}>
                <Text style={{ color: 'blue', marginRight: 10 }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDeleteItem(item.id)}>
                <Text style={{ color: 'red' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 60,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  header: {
    backgroundColor: '#f0f0f0',
  },
  cell: {
    paddingHorizontal: 5,
    textAlignVertical: 'center',
  },
  indexColumn: {
    flex: 0.2,
    fontWeight: 'bold',
  },
  nameColumn: {
    flex: 1,
  },
  actionColumn: {
    flex: 1,
  },
});
