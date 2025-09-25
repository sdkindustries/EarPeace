import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PlaylistsScreen() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      
      // Load from local storage
      const localPlaylists = await AsyncStorage.getItem('tinnitusPlaylists');
      const local = localPlaylists ? JSON.parse(localPlaylists) : [];

      // Try to load from backend if available
      if (BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/audio-settings`);
          if (response.ok) {
            const backendPlaylists = await response.json();
            // Combine local and backend playlists
            const combined = [...local];
            backendPlaylists.forEach(bp => {
              if (!combined.find(lp => lp.id === bp.id)) {
                combined.push(bp);
              }
            });
            setPlaylists(combined);
            return;
          }
        } catch (apiError) {
          console.log('Backend unavailable, using local storage only');
        }
      }

      setPlaylists(local);
    } catch (error) {
      Alert.alert('Error', 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const deletePlaylist = (playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local storage
              const localPlaylists = await AsyncStorage.getItem('tinnitusPlaylists');
              const local = localPlaylists ? JSON.parse(localPlaylists) : [];
              const updated = local.filter(p => p.id !== playlist.id && p.createdAt !== playlist.createdAt);
              await AsyncStorage.setItem('tinnitusPlaylists', JSON.stringify(updated));

              // Remove from backend if available
              if (BACKEND_URL && playlist.id) {
                try {
                  await fetch(`${BACKEND_URL}/api/audio-settings/${playlist.id}`, {
                    method: 'DELETE',
                  });
                } catch (apiError) {
                  console.log('Backend delete failed, but removed locally');
                }
              }

              setPlaylists(prev => prev.filter(p => 
                p.id !== playlist.id && p.createdAt !== playlist.createdAt
              ));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const editPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
    setEditName(playlist.name);
    setEditModalVisible(true);
  };

  const savePlaylistEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Playlist name cannot be empty');
      return;
    }

    try {
      const updatedPlaylist = { ...selectedPlaylist, name: editName.trim() };

      // Update local storage
      const localPlaylists = await AsyncStorage.getItem('tinnitusPlaylists');
      const local = localPlaylists ? JSON.parse(localPlaylists) : [];
      const localUpdated = local.map(p => 
        (p.id === selectedPlaylist.id || p.createdAt === selectedPlaylist.createdAt) 
          ? updatedPlaylist 
          : p
      );
      await AsyncStorage.setItem('tinnitusPlaylists', JSON.stringify(localUpdated));

      // Update backend if available
      if (BACKEND_URL && selectedPlaylist.id) {
        try {
          await fetch(`${BACKEND_URL}/api/audio-settings/${selectedPlaylist.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: editName.trim(),
            }),
          });
        } catch (apiError) {
          console.log('Backend update failed, but updated locally');
        }
      }

      setPlaylists(prev => prev.map(p => 
        (p.id === selectedPlaylist.id || p.createdAt === selectedPlaylist.createdAt)
          ? updatedPlaylist 
          : p
      ));

      setEditModalVisible(false);
      setSelectedPlaylist(null);
      setEditName('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update playlist');
    }
  };

  const loadPlaylist = (playlist) => {
    Alert.alert(
      'Load Playlist',
      `Load "${playlist.name}" settings?`,
      [
        { text: 'Cancel' },
        {
          text: 'Load',
          onPress: () => {
            // Navigate back to main screen with playlist data
            router.push({
              pathname: '/',
              params: { loadPlaylist: JSON.stringify(playlist) },
            });
          },
        },
      ]
    );
  };

  const getPlaylistSummary = (playlist) => {
    const active = [];
    
    // Check noise types
    if (playlist.noiseSettings) {
      Object.keys(playlist.noiseSettings).forEach(noise => {
        if (playlist.noiseSettings[noise]?.enabled) {
          active.push(`${noise} noise`);
        }
      });
    }

    // Check frequencies
    if (playlist.specificFrequency?.enabled) {
      active.push(`${Math.round(playlist.specificFrequency.frequency)}Hz tone`);
    }
    if (playlist.frequencyRange?.enabled) {
      active.push(`${playlist.frequencyRange.minFreq}-${playlist.frequencyRange.maxFreq}Hz range`);
    }

    // Check filters and bursts
    if (playlist.notchFilter?.enabled) {
      active.push(`notch filter`);
    }
    if (playlist.burstSettings?.enabled) {
      active.push('frequency bursts');
    }

    // Check timer
    if (playlist.timer?.enabled) {
      active.push(`${Math.round(playlist.timer.duration / 60)}min timer`);
    }

    return active.length > 0 ? active.join(', ') : 'No active settings';
  };

  const renderPlaylistCard = (playlist, index) => (
    <View key={playlist.id || playlist.createdAt || index} style={styles.playlistCard}>
      <TouchableOpacity
        style={styles.playlistContent}
        onPress={() => loadPlaylist(playlist)}
      >
        <View style={styles.playlistHeader}>
          <Text style={styles.playlistName}>{playlist.name}</Text>
          <Text style={styles.playlistDate}>
            {new Date(playlist.createdAt || playlist.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.playlistSummary} numberOfLines={2}>
          {getPlaylistSummary(playlist)}
        </Text>
      </TouchableOpacity>

      <View style={styles.playlistActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => editPlaylist(playlist)}
        >
          <Ionicons name="pencil" size={20} color="#4ECDC4" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deletePlaylist(playlist)}
        >
          <Ionicons name="trash" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Saved Playlists</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadPlaylists}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading playlists...</Text>
            </View>
          ) : playlists.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes" size={60} color="#666" />
              <Text style={styles.emptyTitle}>No Playlists Yet</Text>
              <Text style={styles.emptyText}>
                Create and save audio settings from the main screen to see them here.
              </Text>
            </View>
          ) : (
            <View style={styles.playlistList}>
              <Text style={styles.sectionTitle}>
                {playlists.length} Saved Playlist{playlists.length !== 1 ? 's' : ''}
              </Text>
              {playlists.map((playlist, index) => renderPlaylistCard(playlist, index))}
            </View>
          )}
        </ScrollView>

        {/* Edit Modal */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Playlist Name</Text>
              
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Playlist name..."
                placeholderTextColor="#666"
                autoFocus
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setEditModalVisible(false);
                    setSelectedPlaylist(null);
                    setEditName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={savePlaylistEdit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: 40,
  },
  playlistList: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 20,
  },
  playlistCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  playlistContent: {
    flex: 1,
    padding: 20,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  playlistDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  playlistSummary: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
  },
  playlistActions: {
    justifyContent: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#222',
  },
  actionButton: {
    padding: 10,
    marginVertical: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#CCC',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});