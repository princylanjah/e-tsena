import { Platform } from 'react-native';
import { getDb } from '../db/init';
import Constants from 'expo-constants';

// Vérifier si on est dans Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// ✅ CORRECTION ICI : Ajout de "export" devant let
// Cela permet à _layout.tsx d'accéder à l'objet Notifications pour les listeners
export let Notifications: any = null;

// Charger le module seulement si pas Expo Go
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    
    // Configuration globale
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('expo-notifications non disponible:', e);
  }
}

export async function registerForPushNotificationsAsync() {
  // Skip dans Expo Go
  if (isExpoGo || !Notifications) {
    console.log('📱 Push notifications désactivées dans Expo Go');
    return true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function addNotificationToHistory(title: string, message: string, achatId?: number, date?: Date) {
  try {
    const db = getDb();
    db.runSync(
      'INSERT INTO Notification (title, message, date, estLu, achatId) VALUES (?, ?, ?, 0, ?)',
      [title, message, date ? date.toISOString() : new Date().toISOString(), achatId || null]
    );
  } catch (e) {
    console.error("Erreur ajout notification:", e);
  }
}

export async function scheduleShoppingReminder(title: string, date: Date, achatId?: number) {
  const trigger = date.getTime() - Date.now();
  
  if (trigger <= 0) return null;

  const notifTitle = "🛒 C'est l'heure des courses !";
  const notifBody = `N'oubliez pas votre liste : ${title}`;

  // 1. Sauvegarder dans l'historique d'abord
  await addNotificationToHistory(notifTitle, notifBody, achatId, date);

  // 2. Si Expo Go, on s'arrête là (simulation)
  if (isExpoGo || !Notifications) {
    console.log('📱 Notification programmée (simulation Expo Go):', notifTitle);
    return 'expo-go-mock-id';
  }

  // 3. Sinon, vraie notification système
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: notifTitle,
        body: notifBody,
        data: { url: `/achat/${achatId}` }, // Important pour la redirection
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: date,
      },
    });
    
    return id;
  } catch (e) {
    console.error('Erreur scheduling notification:', e);
    return 'fallback-id';
  }
}

export async function cancelNotification(notificationId: string) {
  if (isExpoGo || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.error('Erreur annulation notification:', e);
  }
}

export async function cancelAllNotifications() {
  if (isExpoGo || !Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.error('Erreur annulation notifications:', e);
  }
}

// Compter les notifications non lues ET dont la date est passée
export function getUnreadNotificationCount(): number {
  try {
    const db = getDb();
    const result = db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM Notification WHERE estLu = 0 AND date <= datetime('now')"
    );
    return result?.count || 0;
  } catch (e) {
    console.error('Erreur comptage notifications:', e);
    return 0;
  }
}