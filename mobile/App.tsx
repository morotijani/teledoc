import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { COLORS, FONTS } from './src/theme/theme';
import SplashScreen from './src/components/SplashScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext';
import { DocumentViewerProvider } from './src/context/DocumentViewerContext';
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
import DoctorPatientsScreen from './src/screens/doctor/DoctorPatientsScreen';
import DoctorChatListScreen from './src/screens/doctor/DoctorChatListScreen';
import DoctorProfileScreen from './src/screens/doctor/DoctorProfileScreen';
import ConsultationRoomScreen from './src/screens/shared/ConsultationRoomScreen';
import DirectChatScreen from './src/screens/shared/DirectChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const sharedHeaderOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.text,
  },
  headerShadowVisible: false,
};

function PatientHomeStack() {
  return (
    <Stack.Navigator id="PatientHomeStack" screenOptions={sharedHeaderOptions}>
      <Stack.Screen
        name="DoctorDiscovery"
        component={DoctorDiscoveryScreen}
        options={{ headerShown: false }}
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

function PatientAppointmentsStack() {
  return (
    <Stack.Navigator id="PatientAppointmentsStack" screenOptions={sharedHeaderOptions}>
      <Stack.Screen
        name="MyAppointments"
        component={MyAppointmentsScreen}
        options={{ title: 'My Schedule' }}
      />
      <Stack.Screen
        name="ConsultationRoom"
        component={ConsultationRoomScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DirectChat"
        component={DirectChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Prescriptions"
        component={PrescriptionsScreen}
        options={{ title: 'Prescriptions' }}
      />
    </Stack.Navigator>
  );
}

function PatientTabs() {
  return (
    <Tab.Navigator
      id="PatientTabs"
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSubtle,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          height: Platform.OS === 'ios' ? 82 : 64,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.semiBold,
          fontSize: 10,
          marginTop: 2,
        },
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'medical-services';
          if (route.name === 'Find Doctors') iconName = 'search';
          else if (route.name === 'Schedule') iconName = 'calendar-today';
          else if (route.name === 'Prescriptions') iconName = 'medication';
          else if (route.name === 'Lab Tests') iconName = 'science';
          else if (route.name === 'Plan & MoMo') iconName = 'account-balance-wallet';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          return <MaterialIcons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Find Doctors" component={PatientHomeStack} options={{ tabBarLabel: 'Doctors' }} />
      <Tab.Screen name="Schedule" component={PatientAppointmentsStack} options={{ tabBarLabel: 'Visits' }} />
      <Tab.Screen
        name="Prescriptions"
        component={PrescriptionsScreen}
        options={{
          tabBarLabel: 'Rx',
          headerShown: true,
          title: 'Digital Prescriptions',
          ...sharedHeaderOptions,
        }}
      />
      <Tab.Screen
        name="Lab Tests"
        component={LabResultsScreen}
        options={{
          tabBarLabel: 'Labs',
          headerShown: true,
          title: 'Lab Results & Files',
          ...sharedHeaderOptions,
        }}
      />
      <Tab.Screen
        name="Plan & MoMo"
        component={SubscriptionPaywallScreen}
        options={{
          tabBarLabel: 'Plan',
          headerShown: true,
          title: 'Subscription & Billing',
          ...sharedHeaderOptions,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={PatientProfileScreen}
        options={{
          tabBarLabel: 'Account',
          headerShown: true,
          title: 'My Account',
          ...sharedHeaderOptions,
        }}
      />
    </Tab.Navigator>
  );
}

function DoctorHomeStack() {
  return (
    <Stack.Navigator
      id="DoctorHomeStack"
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontFamily: FONTS.bold,
          fontSize: 17,
          color: COLORS.white,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="DoctorDashboard"
        component={DoctorDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostConsultation"
        component={PostConsultationScreen}
        options={{ title: 'Clinical Notes & Rx' }}
      />
      <Stack.Screen
        name="DoctorSchedule"
        component={DoctorScheduleScreen}
        options={{ title: 'Weekly Availability' }}
      />
      <Stack.Screen
        name="ConsultationRoom"
        component={ConsultationRoomScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DirectChat"
        component={DirectChatScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function DoctorPatientsStack() {
  return (
    <Stack.Navigator id="DoctorPatientsStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DoctorPatientsList" component={DoctorPatientsScreen} />
      <Stack.Screen name="DirectChat" component={DirectChatScreen} />
      <Stack.Screen name="ConsultationRoom" component={ConsultationRoomScreen} />
    </Stack.Navigator>
  );
}

function DoctorMessagesStack() {
  return (
    <Stack.Navigator id="DoctorMessagesStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DoctorChatList" component={DoctorChatListScreen} />
      <Stack.Screen name="DirectChat" component={DirectChatScreen} />
      <Stack.Screen name="ConsultationRoom" component={ConsultationRoomScreen} />
    </Stack.Navigator>
  );
}

function DoctorTabs() {
  return (
    <Tab.Navigator
      id="DoctorTabs"
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSubtle,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          height: Platform.OS === 'ios' ? 82 : 64,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.semiBold,
          fontSize: 10,
          marginTop: 2,
        },
        headerShown: false,
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'dashboard';
          if (route.name === 'Home') iconName = 'dashboard';
          else if (route.name === 'Patients') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Messages') iconName = focused ? 'chat-bubble' : 'chat-bubble-outline';
          else if (route.name === 'Hours') iconName = 'schedule';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          return <MaterialIcons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DoctorHomeStack} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Patients" component={DoctorPatientsStack} options={{ tabBarLabel: 'Patients' }} />
      <Tab.Screen name="Messages" component={DoctorMessagesStack} options={{ tabBarLabel: 'Messages' }} />
      <Tab.Screen
        name="Hours"
        component={DoctorScheduleScreen}
        options={{
          tabBarLabel: 'Hours',
          headerShown: true,
          title: 'Weekly Availability',
          ...sharedHeaderOptions,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={DoctorProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          headerShown: true,
          title: 'Doctor Profile',
          ...sharedHeaderOptions,
        }}
      />
    </Tab.Navigator>
  );
}

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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initializing TeleDoc Ghana...</Text>
      </View>
    );
  }

  if (!token || !user) {
    return <AuthStack />;
  }

  if (user.role === 'DOCTOR') {
    if (doctorVerification?.status !== 'APPROVED') {
      return <DoctorPendingScreen />;
    }
    return <DoctorTabs />;
  }

  return <PatientTabs />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <View style={{ flex: 1 }}>
      {fontsLoaded && (
        <AlertProvider>
          <DocumentViewerProvider>
            <AuthProvider>
              <NavigationContainer>
                <StatusBar style={showSplash ? 'light' : 'dark'} />
                <NavigationRoot />
              </NavigationContainer>
            </AuthProvider>
          </DocumentViewerProvider>
        </AlertProvider>
      )}
      {showSplash && (
        <SplashScreen
          fontsLoaded={fontsLoaded}
          onFinish={() => setShowSplash(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },
});
