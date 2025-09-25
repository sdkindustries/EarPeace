import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from 'react-native-slider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const NOISE_TYPES = ['white', 'pink', 'brown', 'gray', 'blue'];
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TinnitusTherapyApp() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [sounds, setSounds] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Noise controls
  const [noiseSettings, setNoiseSettings] = useState({
    white: { enabled: false, volume: 0.5 },
    pink: { enabled: false, volume: 0.5 },
    brown: { enabled: false, volume: 0.5 },
    gray: { enabled: false, volume: 0.5 },
    blue: { enabled: false, volume: 0.5 },
  });

  // Frequency controls
  const [specificFrequency, setSpecificFrequency] = useState({
    enabled: false,
    frequency: 440,
    volume: 0.5,
  });

  const [frequencyRange, setFrequencyRange] = useState({
    enabled: false,
    minFreq: 100,
    maxFreq: 1000,
    volume: 0.5,
  });

  // Notch filter
  const [notchFilter, setNotchFilter] = useState({
    enabled: false,
    frequency: 1000,
  });

  // Burst settings
  const [burstSettings, setBurstSettings] = useState({
    enabled: false,
    frequency: 440,
    duration: 1000, // ms
    interval: 2000, // ms
    randomRange: false,
    minFreq: 200,
    maxFreq: 2000,
  });

  // Timer
  const [timer, setTimer] = useState({
    enabled: false,
    duration: 300, // seconds (5 minutes)
    remaining: 0,
  });

  // UI state
  const [activeTab, setActiveTab] = useState('noise');
  const [playlistName, setPlaylistName] = useState('');

  // Audio setup
  useEffect(() => {
    setupAudio();
    return () => {
      cleanupAudio();
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
      setAudioEnabled(true);
    } catch (error) {
      Alert.alert('Audio Error', 'Failed to initialize audio system');
    }
  };

  const cleanupAudio = () => {
    Object.values(sounds).forEach((sound: any) => {
      if (sound) {
        sound.unloadAsync();
      }
    });
  };

  const generateWhiteNoise = () => {
    // Simplified white noise generation for demo
    // In a real app, you'd use Web Audio API or generate actual audio buffers
    return new Promise((resolve) => {
      setTimeout(() => resolve({ play: () => {}, pause: () => {}, stop: () => {} }), 100);
    });
  };

  const playAudio = async () => {
    if (!audioEnabled) {
      Alert.alert('Audio Not Ready', 'Please wait for audio system to initialize');
      return;
    }

    try {
      setIsPlaying(true);
      
      // Start timer if enabled
      if (timer.enabled) {
        setTimer(prev => ({ ...prev, remaining: prev.duration }));
      }

      // Generate and play enabled sounds
      // This is a simplified implementation - in production you'd use proper audio synthesis
      Alert.alert('Audio Started', 'Tinnitus therapy audio is now playing');
    } catch (error) {
      Alert.alert('Playback Error', 'Failed to start audio playback');
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    setIsPlaying(false);
    setTimer(prev => ({ ...prev, remaining: 0 }));
    Alert.alert('Audio Stopped', 'Tinnitus therapy audio has been stopped');
  };

  const savePlaylist = async () => {
    if (!playlistName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your playlist');
      return;
    }

    try {
      const playlistData = {
        name: playlistName,
        noiseSettings,
        specificFrequency,
        frequencyRange,
        notchFilter,
        burstSettings,
        timer,
        createdAt: new Date().toISOString(),
      };

      const existingPlaylists = await AsyncStorage.getItem('tinnitusPlaylists');
      const playlists = existingPlaylists ? JSON.parse(existingPlaylists) : [];
      playlists.push(playlistData);
      
      await AsyncStorage.setItem('tinnitusPlaylists', JSON.stringify(playlists));
      
      Alert.alert('Success', 'Playlist saved successfully');
      setPlaylistName('');
    } catch (error) {
      Alert.alert('Save Error', 'Failed to save playlist');
    }
  };

  const renderNoiseControls = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Noise Types</Text>
      {NOISE_TYPES.map((type) => (
        <View key={type} style={styles.controlRow}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlLabel}>{type.toUpperCase()} Noise</Text>
            <Switch
              value={noiseSettings[type]?.enabled}
              onValueChange={(enabled) =>
                setNoiseSettings(prev => ({
                  ...prev,
                  [type]: { ...prev[type], enabled }
                }))
              }
              trackColor={{ false: '#333', true: '#007AFF' }}
            />
          </View>
          {noiseSettings[type]?.enabled && (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Volume: {Math.round(noiseSettings[type].volume * 100)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={noiseSettings[type].volume}
                onValueChange={(volume) =>
                  setNoiseSettings(prev => ({
                    ...prev,
                    [type]: { ...prev[type], volume }
                  }))
                }
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#333"
                thumbStyle={styles.sliderThumb}
              />
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderFrequencyControls = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Frequency Generation</Text>
      
      {/* Specific Frequency */}
      <View style={styles.controlRow}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlLabel}>Specific Frequency</Text>
          <Switch
            value={specificFrequency.enabled}
            onValueChange={(enabled) =>
              setSpecificFrequency(prev => ({ ...prev, enabled }))
            }
            trackColor={{ false: '#333', true: '#007AFF' }}
          />
        </View>
        {specificFrequency.enabled && (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Frequency: {specificFrequency.frequency} Hz
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={25000}
              value={specificFrequency.frequency}
              onValueChange={(frequency) =>
                setSpecificFrequency(prev => ({ ...prev, frequency: Math.round(frequency) }))
              }
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
            />
            <Text style={styles.sliderLabel}>
              Volume: {Math.round(specificFrequency.volume * 100)}%
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={specificFrequency.volume}
              onValueChange={(volume) =>
                setSpecificFrequency(prev => ({ ...prev, volume }))
              }
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
            />
          </View>
        )}
      </View>

      {/* Frequency Range */}
      <View style={styles.controlRow}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlLabel}>Frequency Range</Text>
          <Switch
            value={frequencyRange.enabled}
            onValueChange={(enabled) =>
              setFrequencyRange(prev => ({ ...prev, enabled }))
            }
            trackColor={{ false: '#333', true: '#007AFF' }}
          />
        </View>
        {frequencyRange.enabled && (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Min: {frequencyRange.minFreq} Hz - Max: {frequencyRange.maxFreq} Hz
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={25000}
              value={frequencyRange.minFreq}
              onValueChange={(minFreq) =>
                setFrequencyRange(prev => ({ ...prev, minFreq: Math.round(minFreq) }))
              }
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
            />
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={25000}
              value={frequencyRange.maxFreq}
              onValueChange={(maxFreq) =>
                setFrequencyRange(prev => ({ ...prev, maxFreq: Math.round(maxFreq) }))
              }
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#333"
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderNotchFilter = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notch Filter</Text>
      <View style={styles.controlRow}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlLabel}>Enable Notch Filter</Text>
          <Switch
            value={notchFilter.enabled}
            onValueChange={(enabled) =>
              setNotchFilter(prev => ({ ...prev, enabled }))
            }
            trackColor={{ false: '#333', true: '#007AFF' }}
          />
        </View>
        {notchFilter.enabled && (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Notch Frequency: {notchFilter.frequency} Hz
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={25000}
              value={notchFilter.frequency}
              onValueChange={(frequency) =>
                setNotchFilter(prev => ({ ...prev, frequency: Math.round(frequency) }))
              }
              minimumTrackTintColor="#FF6B6B"
              maximumTrackTintColor="#333"
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderBurstControls = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Burst Settings</Text>
      <View style={styles.controlRow}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlLabel}>Enable Bursts</Text>
          <Switch
            value={burstSettings.enabled}
            onValueChange={(enabled) =>
              setBurstSettings(prev => ({ ...prev, enabled }))
            }
            trackColor={{ false: '#333', true: '#007AFF' }}
          />
        </View>
        {burstSettings.enabled && (
          <View style={styles.sliderContainer}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Random Range</Text>
              <Switch
                value={burstSettings.randomRange}
                onValueChange={(randomRange) =>
                  setBurstSettings(prev => ({ ...prev, randomRange }))
                }
                trackColor={{ false: '#333', true: '#4ECDC4' }}
              />
            </View>
            
            {!burstSettings.randomRange ? (
              <>
                <Text style={styles.sliderLabel}>
                  Frequency: {burstSettings.frequency} Hz
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={25000}
                  value={burstSettings.frequency}
                  onValueChange={(frequency) =>
                    setBurstSettings(prev => ({ ...prev, frequency: Math.round(frequency) }))
                  }
                  minimumTrackTintColor="#4ECDC4"
                  maximumTrackTintColor="#333"
                />
              </>
            ) : (
              <>
                <Text style={styles.sliderLabel}>
                  Range: {burstSettings.minFreq} - {burstSettings.maxFreq} Hz
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={25000}
                  value={burstSettings.minFreq}
                  onValueChange={(minFreq) =>
                    setBurstSettings(prev => ({ ...prev, minFreq: Math.round(minFreq) }))
                  }
                  minimumTrackTintColor="#4ECDC4"
                  maximumTrackTintColor="#333"
                />
                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={25000}
                  value={burstSettings.maxFreq}
                  onValueChange={(maxFreq) =>
                    setBurstSettings(prev => ({ ...prev, maxFreq: Math.round(maxFreq) }))
                  }
                  minimumTrackTintColor="#4ECDC4"
                  maximumTrackTintColor="#333"
                />
              </>
            )}
            
            <Text style={styles.sliderLabel}>
              Burst Duration: {burstSettings.duration} ms
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={5000}
              value={burstSettings.duration}
              onValueChange={(duration) =>
                setBurstSettings(prev => ({ ...prev, duration: Math.round(duration) }))
              }
              minimumTrackTintColor="#4ECDC4"
              maximumTrackTintColor="#333"
            />
            
            <Text style={styles.sliderLabel}>
              Interval: {burstSettings.interval} ms
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={500}
              maximumValue={10000}
              value={burstSettings.interval}
              onValueChange={(interval) =>
                setBurstSettings(prev => ({ ...prev, interval: Math.round(interval) }))
              }
              minimumTrackTintColor="#4ECDC4"
              maximumTrackTintColor="#333"
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderTimerControls = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Timer</Text>
      <View style={styles.controlRow}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlLabel}>Enable Timer</Text>
          <Switch
            value={timer.enabled}
            onValueChange={(enabled) =>
              setTimer(prev => ({ ...prev, enabled }))
            }
            trackColor={{ false: '#333', true: '#007AFF' }}
          />
        </View>
        {timer.enabled && (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Duration: {Math.round(timer.duration / 60)} minutes
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={60}
              maximumValue={3600}
              value={timer.duration}
              onValueChange={(duration) =>
                setTimer(prev => ({ ...prev, duration: Math.round(duration) }))
              }
              minimumTrackTintColor="#FF9500"
              maximumTrackTintColor="#333"
            />
            {timer.remaining > 0 && (
              <Text style={styles.timerDisplay}>
                Time Remaining: {Math.round(timer.remaining / 60)} minutes
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'noise':
        return renderNoiseControls();
      case 'frequency':
        return renderFrequencyControls();
      case 'filter':
        return renderNotchFilter();
      case 'burst':
        return renderBurstControls();
      case 'timer':
        return renderTimerControls();
      default:
        return renderNoiseControls();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tinnitus Therapy</Text>
          <Text style={styles.subtitle}>Advanced Audio Treatment</Text>
        </View>

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
          {[
            { key: 'noise', label: 'Noise', icon: 'volume-medium' },
            { key: 'frequency', label: 'Frequency', icon: 'pulse' },
            { key: 'filter', label: 'Notch', icon: 'funnel' },
            { key: 'burst', label: 'Burst', icon: 'flash' },
            { key: 'timer', label: 'Timer', icon: 'time' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? '#007AFF' : '#666'}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Main Content */}
        <ScrollView style={styles.content}>
          {renderTabContent()}
        </ScrollView>

        {/* Control Panel */}
        <View style={styles.controlPanel}>
          {/* Playlist Save */}
          <View style={styles.playlistContainer}>
            <TextInput
              style={styles.playlistInput}
              placeholder="Playlist name..."
              placeholderTextColor="#666"
              value={playlistName}
              onChangeText={setPlaylistName}
            />
            <TouchableOpacity style={styles.saveButton} onPress={savePlaylist}>
              <Ionicons name="save" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Play/Stop Controls */}
          <View style={styles.playControls}>
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.stopButton]}
              onPress={isPlaying ? stopAudio : playAudio}
            >
              <Ionicons
                name={isPlaying ? 'stop' : 'play'}
                size={30}
                color="#FFF"
              />
              <Text style={styles.playButtonText}>
                {isPlaying ? 'Stop' : 'Play'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#222',
  },
  activeTab: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  tabText: {
    color: '#666',
    marginLeft: 5,
    fontSize: 14,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 15,
  },
  controlRow: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  controlLabel: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  sliderContainer: {
    marginTop: 10,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 5,
  },
  slider: {
    height: 30,
    marginVertical: 5,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  timerDisplay: {
    fontSize: 16,
    color: '#FF9500',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
  controlPanel: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  playlistContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  playlistInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 16,
    marginRight: 10,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    marginLeft: 5,
    fontSize: 16,
    fontWeight: '600',
  },
  playControls: {
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});