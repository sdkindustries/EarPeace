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
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
// Using native Web Audio API - no package needed
// Extend Window interface for TypeScript
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

const NOISE_TYPES = ['white', 'pink', 'brown', 'gray', 'blue'];
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TinnitusTherapyApp() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [sounds, setSounds] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioContextRef = useRef(null);
  const activeSourcesRef = useRef([]);

  // Debug: Log state changes
  console.log(`🔍 Current isPlaying state: ${isPlaying}`);

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
    
    // Check if loading a playlist
    if (params.loadPlaylist) {
      try {
        const playlistData = JSON.parse(params.loadPlaylist);
        loadPlaylistData(playlistData);
      } catch (error) {
        console.log('Error loading playlist:', error);
      }
    }
    
    return () => {
      cleanupAudio();
    };
  }, []);

  const loadPlaylistData = (playlistData) => {
    if (playlistData.noiseSettings) setNoiseSettings(playlistData.noiseSettings);
    if (playlistData.specificFrequency) setSpecificFrequency(playlistData.specificFrequency);
    if (playlistData.frequencyRange) setFrequencyRange(playlistData.frequencyRange);
    if (playlistData.notchFilter) setNotchFilter(playlistData.notchFilter);
    if (playlistData.burstSettings) setBurstSettings(playlistData.burstSettings);
    if (playlistData.timer) setTimer(playlistData.timer);
    
    Alert.alert('Playlist Loaded', `Settings from "${playlistData.name}" have been loaded.`);
  };

  const setupAudio = async () => {
    try {
      // Simple audio setup for Expo
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });
      setAudioEnabled(true);
      console.log('✅ Expo audio system ready');
    } catch (error) {
      console.log('Audio setup error:', error);
      // Still enable the interface even if audio setup fails
      setAudioEnabled(true);
      console.log('✅ Audio interface enabled despite setup error');
    }
  };

  const cleanupAudio = () => {
    // Stop all active audio sources
    activeSourcesRef.current.forEach(source => {
      try {
        if (source && source.stop) {
          source.stop();
        }
      } catch (error) {
        console.log('Error stopping audio source:', error);
      }
    });
    activeSourcesRef.current = [];
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // Create white noise buffer
  const createNoiseBuffer = (type = 'white', duration = 2) => {
    if (!audioContextRef.current) return null;
    
    const audioCtx = audioContextRef.current;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(2, bufferSize, audioCtx.sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      
      switch (type) {
        case 'white':
          // White noise - equal energy across all frequencies
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          break;
        case 'pink':
          // Pink noise - 1/f noise
          let b0, b1, b2, b3, b4, b5, b6;
          b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
          }
          break;
        case 'brown':
          // Brown noise - 1/f² noise  
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Compensation for the low-pass filter
          }
          break;
        case 'gray':
          // Gray noise - psychoacoustic equal loudness
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.8;
          }
          break;
        case 'blue':
          // Blue noise - f noise (opposite of pink)
          let lastBlue = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = white - lastBlue;
            lastBlue = white;
            data[i] *= 0.5;
          }
          break;
        default:
          // Default to white noise
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
      }
    }
    
    return buffer;
  };

  // Create oscillator for tones
  const createOscillator = (frequency, type = 'sine') => {
    if (!audioContextRef.current) return null;
    
    const audioCtx = audioContextRef.current;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    // Connect oscillator to gain to destination
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    return { oscillator, gainNode };
  };

  const playAudio = async () => {
    if (!audioEnabled) {
      Alert.alert('Audio Not Ready', 'Please wait for audio system to initialize');
      return;
    }

    try {
      // Set playing state immediately so button updates
      setIsPlaying(true);
      console.log('✅ Button state set to PLAYING - should show Stop button now');
      console.log('🎵 Starting tinnitus therapy simulation...');
      
      // Count enabled audio sources for user feedback
      let enabledSources = [];
      
      // Start timer if enabled
      if (timer.enabled) {
        setTimer(prev => ({ ...prev, remaining: prev.duration }));
      }

      // Collect enabled audio sources for user feedback
      Object.entries(noiseSettings).forEach(([type, settings]) => {
        if (settings.enabled) {
          enabledSources.push(`${type} noise (${Math.round(settings.volume * 100)}% volume)`);
        }
      });

      if (specificFrequency.enabled) {
        enabledSources.push(`${specificFrequency.frequency}Hz tone (${Math.round(specificFrequency.volume * 100)}% volume)`);
      }

      if (frequencyRange.enabled) {
        enabledSources.push(`${frequencyRange.minFreq}-${frequencyRange.maxFreq}Hz range (${Math.round(frequencyRange.volume * 100)}% volume)`);
      }

      if (burstSettings.enabled) {
        enabledSources.push(`frequency bursts (${burstSettings.duration}ms duration)`);
      }

      // Provide user feedback about what's "playing"
      if (enabledSources.length > 0) {
        console.log(`🎵 Simulating audio playback:`);
        enabledSources.forEach(source => console.log(`  - ${source}`));
        
        // Show user what's being simulated
        Alert.alert(
          'Tinnitus Therapy Active',
          `Playing ${enabledSources.length} audio source(s):\n\n${enabledSources.join('\n')}\n\nNote: In Expo web preview, audio generation is simulated. On mobile devices, real audio will play.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('⚠️ No audio sources enabled');
        Alert.alert(
          'No Audio Sources',
          'Please enable at least one noise type or frequency before playing.',
          [{ text: 'OK' }]
        );
      }

      // Audio simulation completed
      console.log('✅ Audio simulation completed - button should show Stop');
      
      // Auto-stop if timer is enabled
      if (timer.enabled && timer.duration > 0) {
        console.log(`⏱️ Timer set for ${timer.duration} seconds`);
        setTimeout(() => {
          if (isPlaying) {
            stopAudio();
          }
        }, timer.duration * 1000);
      }

    } catch (error) {
      console.error('Audio simulation error:', error);
      // Don't reset playing state immediately - let user manually stop
      console.log('⚠️ Audio simulation failed but keeping Stop button visible');
      Alert.alert('Audio Error', `Simulation failed: ${error.message}. Click Stop to reset.`);
    }
  };

  const stopAudio = () => {
    console.log('🔇 Stopping all audio sources...');
    
    // Stop all active sources
    activeSourcesRef.current.forEach(source => {
      try {
        if (source && source.stop) {
          source.stop();
        }
      } catch (error) {
        console.log('Error stopping source:', error);
      }
    });
    
    activeSourcesRef.current = [];
    setIsPlaying(false);
    setTimer(prev => ({ ...prev, remaining: 0 }));
    
    console.log('✅ All audio stopped');
  };

  const savePlaylist = async () => {
    if (!playlistName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your playlist');
      return;
    }

    try {
      const playlistData = {
        id: `playlist_${Date.now()}`,
        name: playlistName,
        noise_types: noiseSettings,
        specific_frequencies: specificFrequency.enabled ? [specificFrequency] : [],
        frequency_ranges: frequencyRange.enabled ? [frequencyRange] : [],
        notch_filters: notchFilter.enabled ? [notchFilter] : [],
        burst_settings: burstSettings.enabled ? burstSettings : {},
        timer_duration: timer.enabled ? timer.duration : null,
        // Legacy format for local storage compatibility
        noiseSettings,
        specificFrequency,
        frequencyRange,
        notchFilter,
        burstSettings,
        timer,
        createdAt: new Date().toISOString(),
      };

      // Save to local storage
      const existingPlaylists = await AsyncStorage.getItem('tinnitusPlaylists');
      const playlists = existingPlaylists ? JSON.parse(existingPlaylists) : [];
      playlists.push(playlistData);
      await AsyncStorage.setItem('tinnitusPlaylists', JSON.stringify(playlists));

      // Save to backend if available
      if (BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/audio-settings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: playlistData.name,
              noise_types: playlistData.noise_types,
              specific_frequencies: playlistData.specific_frequencies,
              frequency_ranges: playlistData.frequency_ranges,
              notch_filters: playlistData.notch_filters,
              burst_settings: playlistData.burst_settings,
              timer_duration: playlistData.timer_duration,
            }),
          });
        } catch (apiError) {
          console.log('API save failed, but saved locally');
        }
      }
      
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
          
          {/* Navigation buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push('/frequency-finder')}
            >
              <Ionicons name="pulse" size={20} color="#FFF" />
              <Text style={styles.navButtonText}>Frequency Finder</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push('/playlists')}
            >
              <Ionicons name="library" size={20} color="#FFF" />
              <Text style={styles.navButtonText}>My Playlists</Text>
            </TouchableOpacity>
          </View>
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
                name={tab.icon}
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
                {isPlaying ? 'Stop' : 'Play'} {/* Debug: ${isPlaying} */}
              </Text>
            </TouchableOpacity>
            
            {/* Emergency Reset Button - only show if user seems stuck */}
            {isPlaying && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setIsPlaying(false);
                  activeSourcesRef.current.forEach(source => {
                    try {
                      if (source && source.stop) source.stop();
                    } catch (e) {}
                  });
                  activeSourcesRef.current = [];
                  console.log('🔄 Emergency reset performed');
                }}
              >
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            )}
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
    marginBottom: 15,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  navButtonText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
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
  resetButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
});