import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterPatientScreen from './src/screens/auth/RegisterPatientScreen';
import RegisterDoctorScreen from './src/screens/auth/RegisterDoctorScreen';
import DoctorPendingScreen from './src/screens/auth/DoctorPendingScreen';

import DoctorDiscoveryScreen from './src/screens/patient/DoctorDiscoveryScreen';
import DoctorDetailScreen from './src/screens/patient/DoctorDetailScreen';
import BookAppointmentScreen from './src/screens/patient/BookAppointmentScreen';
import MyAppointmentsScreen from './src/screens/patient/MyAppointmentsScreen';
import PrescriptionsScreen from './src/screens/patient/PrescriptionsScreen';
import LabResultsScreen from './src/screens/patient/LabResultsScreen';
import SubscriptionPaywallScreen from './src/screens/patient/SubscriptionPaywallScreen';
import PatientProfileScreen from './src/screens/patient/PatientProfileScreen';

import DoctorDashboardScreen from './src/screens/doctor/DoctorDashboardScreen';
import PostConsultationScreen from './src/screens/doctor/PostConsultationScreen';
import DoctorScheduleScreen from './src/screens/doctor/DoctorScheduleScreen';
import ConsultationRoomScreen from './src/screens/shared/ConsultationRoomScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Patient Stack for Discovery & Booking
function PatientHomeStack() {
  return (
    <Stack.Navigator
      id="PatientHomeStack"
      screenOptions={{
        headerStyle: { backgroundColor: '#059669' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen
        name="DoctorDiscovery"
        component={DoctorDiscoveryScreen}
        options={{ title: 'TeleDoc Ghana' }}
      />
      <Stack.Screen
        name="DoctorDetail"
        component={DoctorDetailScreen}
        options={{ title: 'Physician Profile' }}
      />
      <Stack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
        options={{ title: 'Book Consultation' }}
      />
      <Stack.Screen
        name="ConsultationRoom"
        component={ConsultationRoomScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Patient Stack for Appointments Tab
function PatientAppointmentsStack() {
  return (
    <Stack.Navigator
      id="PatientAppointmentsStack"
      screenOptions={{
        headerStyle: { backgroundColor: '#059669' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen
        name="MyAppointments"
        component={MyAppointmentsScreen}
        options={{ title: 'My Appointments' }}
      />
      <Stack.Screen
        name="ConsultationRoom"
        component={ConsultationRoomScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Prescriptions"
        component={PrescriptionsScreen}
        options={{ title: 'e-Prescriptions' }}
      />
    </Stack.Navigator>
  );
}

// Patient Bottom Tabs Navigator
function PatientTabs() {
  return (
    <Tab.Navigator
      id="PatientTabs"
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          let icon = '🩺';
          if (route.name === 'Find Doctors') icon = '🔍';
          else if (route.name === 'Schedule') icon = '📅';
          else if (route.name === 'Prescriptions') icon = '💊';
          else if (route.name === 'Lab Tests') icon = '🧪';
          else if (route.name === 'Plan & MoMo') icon = '💳';
          else if (route.name === 'Profile') icon = '👤';

          return <Text style={{ fontSize: focused ? 20 : 18 }}>{icon}</Text>;
        },
      })}
    >
      <Tab.Screen name="Find Doctors" component={PatientHomeStack} />
      <Tab.Screen name="Schedule" component={PatientAppointmentsStack} />
      <Tab.Screen
        name="Prescriptions"
        component={PrescriptionsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#fff',
        }}
      />
      <Tab.Screen
        name="Lab Tests"
        component={LabResultsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#fff',
        }}
      />
      <Tab.Screen
        name="Plan & MoMo"
        component={SubscriptionPaywallScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#fff',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={PatientProfileScreen}
        options={{
          headerShown: true,
          title: 'My Profile & Account',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#fff',
        }}
      />
    </Tab.Navigator>
  );
}

// Doctor Stack Navigator
function DoctorStack() {
  return (
    <Stack.Navigator
      id="DoctorStack"
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen
        name="DoctorDashboard"
        component={DoctorDashboardScreen}
        options={{ title: 'Clinical Workspace' }}
      />
      <Stack.Screen
        name="PostConsultation"
        component={PostConsultationScreen}
        options={{ title: 'Clinical Notes & Rx' }}
      />
      <Stack.Screen
        name="DoctorSchedule"
        component={DoctorScheduleScreen}
        options={{ title: 'Consultation Availability' }}
      />
      <Stack.Screen
        name="ConsultationRoom"
        component={ConsultationRoomScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Authentication Stack
function AuthStack() {
  return (
    <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterPatient" component={RegisterPatientScreen} />
      <Stack.Screen name="RegisterDoctor" component={RegisterDoctorScreen} />
    </Stack.Navigator>
  );
}

function NavigationRoot() {
  const { token, user, doctorVerification, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Initializing TeleDoc Ghana...</Text>
      </View>
    );
  }

  // If not authenticated -> Auth Stack
  if (!token || !user) {
    return <AuthStack />;
  }

  // Doctor Role
  if (user.role === 'DOCTOR') {
    // If pending or rejected -> Show Pending Screen
    if (doctorVerification?.status !== 'APPROVED') {
      return <DoctorPendingScreen />;
    }
    return <DoctorStack />;
  }

  // Patient Role
  return <PatientTabs />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <NavigationRoot />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
});
