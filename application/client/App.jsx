// App.jsx – CORRECT REACT NAVIGATION SETUP
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screen/homeScreen.jsx';
import PinScreen from './screen/pinScreen.jsx';
import BalanceScreen from './screen/balanceScreen.jsx';
import TransactionsScreen from './screen/transactionsScreen.jsx';
import LoansScreen from './screen/loansScreen.jsx';
import InsuranceScreen from './screen/insuranceScreen.jsx';
import InvestmentsScreen from './screen/investmentScreen.jsx';
import SendMoneySearchScreen from './screen/sendMoneySearchScreen.jsx';
import SendMoneyAmountScreen from './screen/sendMoneyAmountScreen.jsx';
import TransactionSuccessScreen from './screen/transactionSuccessScreen.jsx';
import SelfBankSelectScreen from './screen/selfBankSelectScreen.jsx';
import ChatScreen from './screen/chatScreen.jsx';
import LoginScreen from './screen/loginScreen.jsx';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="PinScreen" component={PinScreen} />
          <Stack.Screen name="BalanceScreen" component={BalanceScreen} />
          <Stack.Screen name="Transactions" component={TransactionsScreen} />
          <Stack.Screen name="LoansScreen" component={LoansScreen} />
          <Stack.Screen name="InsuranceScreen" component={InsuranceScreen} />
          <Stack.Screen name="InvestmentsScreen" component={InvestmentsScreen} />
          <Stack.Screen name="SendMoneySearchScreen" component={SendMoneySearchScreen} />
          <Stack.Screen name="SendMoneyAmountScreen" component={SendMoneyAmountScreen} />
          <Stack.Screen name="TransactionSuccessScreen" component={TransactionSuccessScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SelfBankSelectScreen" component={SelfBankSelectScreen} />
          <Stack.Screen name="ChatScreen" component={ChatScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>

  );
}