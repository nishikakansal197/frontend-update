import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { MapPin, ChevronDown, X, Navigation } from 'lucide-react-native';
import { getStates, getDistrictsByState, getAreasByDistrict } from '../lib/supabase';
import * as Location from 'expo-location';

export default function LocationSelector({ 
  visible, 
  onClose, 
  onLocationSelected, 
  title = "Select Location",
  allowCurrentLocation = true 
}) {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('method'); // 'method', 'state', 'district', 'area'

  useEffect(() => {
    if (visible) {
      loadStates();
      resetSelection();
    }
  }, [visible]);

  const resetSelection = () => {
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedArea('');
    setDistricts([]);
    setAreas([]);
    setStep('method');
  };

  const loadStates = async () => {
    try {
      setLoading(true);
      const { data, error } = await getStates();
      if (error) throw error;
      setStates(data || []);
    } catch (error) {
      console.error('Error loading states:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async (stateId) => {
    try {
      setLoading(true);
      const { data, error } = await getDistrictsByState(stateId);
      if (error) throw error;
      setDistricts(data || []);
      setAreas([]);
    } catch (error) {
      console.error('Error loading districts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAreas = async (districtId) => {
    try {
      setLoading(true);
      const { data, error } = await getAreasByDistrict(districtId);
      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStateSelect = (state) => {
    setSelectedState(state.id);
    setSelectedDistrict('');
    setSelectedArea('');
    loadDistricts(state.id);
    setStep('district');
  };

  const handleDistrictSelect = (district) => {
    setSelectedDistrict(district.id);
    setSelectedArea('');
    loadAreas(district.id);
    setStep('area');
  };

  const handleAreaSelect = (area) => {
    setSelectedArea(area.id);
    
    const selectedStateData = states.find(s => s.id === selectedState);
    const selectedDistrictData = districts.find(d => d.id === selectedDistrict);
    
    const locationData = {
      stateId: selectedState,
      stateName: selectedStateData?.name,
      districtId: selectedDistrict,
      districtName: selectedDistrictData?.name,
      areaId: area.id,
      areaName: area.name,
      fullAddress: `${area.name}, ${selectedDistrictData?.name}, ${selectedStateData?.name}`,
      locationType: 'manual'
    };

    onLocationSelected(locationData);
    onClose();
  };

  const useCurrentLocation = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const locationData = {
          latitude,
          longitude,
          address: `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`,
          locationName: `${address.street || ''} ${address.name || ''}`.trim(),
          area: address.district || address.subregion || '',
          ward: address.city || '',
          locationType: 'current'
        };

        onLocationSelected(locationData);
        onClose();
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.methodContainer}>
      <Text style={styles.sectionTitle}>Choose Location Method</Text>
      
      {allowCurrentLocation && (
        <TouchableOpacity
          style={styles.methodButton}
          onPress={useCurrentLocation}
          disabled={loading}
        >
          <Navigation size={24} color="#10B981" />
          <View style={styles.methodContent}>
            <Text style={styles.methodTitle}>Use Current Location</Text>
            <Text style={styles.methodDescription}>
              Automatically detect your GPS location
            </Text>
          </View>
          {loading && <ActivityIndicator size="small" color="#10B981" />}
        </TouchableOpacity>
      )}

      <Text style={styles.orText}>OR</Text>

      <TouchableOpacity
        style={styles.methodButton}
        onPress={() => setStep('state')}
      >
        <MapPin size={24} color="#1E40AF" />
        <View style={styles.methodContent}>
          <Text style={styles.methodTitle}>Select Manually</Text>
          <Text style={styles.methodDescription}>
            Choose from state, district, and area
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStateSelection = () => (
    <View style={styles.selectionContainer}>
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={() => setStep('method')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.selectionTitle}>Select State</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading states...</Text>
        </View>
      ) : (
        <ScrollView style={styles.optionsList}>
          {states.map((state) => (
            <TouchableOpacity
              key={state.id}
              style={styles.optionItem}
              onPress={() => handleStateSelect(state)}
            >
              <Text style={styles.optionName}>{state.name}</Text>
              <Text style={styles.optionCode}>({state.code})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderDistrictSelection = () => (
    <View style={styles.selectionContainer}>
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={() => setStep('state')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.selectionTitle}>Select District</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading districts...</Text>
        </View>
      ) : (
        <ScrollView style={styles.optionsList}>
          {districts.map((district) => (
            <TouchableOpacity
              key={district.id}
              style={styles.optionItem}
              onPress={() => handleDistrictSelect(district)}
            >
              <Text style={styles.optionName}>{district.name}</Text>
              <Text style={styles.optionCode}>({district.code})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderAreaSelection = () => (
    <View style={styles.selectionContainer}>
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={() => setStep('district')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.selectionTitle}>Select Area</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading areas...</Text>
        </View>
      ) : (
        <ScrollView style={styles.optionsList}>
          {areas.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={styles.optionItem}
              onPress={() => handleAreaSelect(area)}
            >
              <Text style={styles.optionName}>{area.name}</Text>
              <Text style={styles.optionCode}>({area.code})</Text>
              {area.description && (
                <Text style={styles.optionDescription}>{area.description}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 'method': return renderMethodSelection();
      case 'state': return renderStateSelection();
      case 'district': return renderDistrictSelection();
      case 'area': return renderAreaSelection();
      default: return renderMethodSelection();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  methodContainer: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  selectionContainer: {
    flex: 1,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  backText: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: '500',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  optionsList: {
    flex: 1,
  },
  optionItem: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionCode: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
});