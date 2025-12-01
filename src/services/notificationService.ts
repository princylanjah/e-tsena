import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDb } from '../db/init';

// Configuration globale
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

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
  
  if (finalStatus !== 'granted') {
    return null;
  }

  return true;
}

export async function addNotificationToHistory(title: string, message: string, achatId?: number, date?: Date) {
  try {
    const db = getDb();
    db.runSync(
      'INSERT INTO Notification (title, message, date, read, achatId) VALUES (?, ?, ?, 0, ?)',
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

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: notifTitle,
      body: notifBody,
      data: { achatId }, // Passer l'ID dans les data pour le handler (si besoin plus tard)
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: date,
    },
  });
  
  // Ajouter à l'historique avec la date de rappel
  await addNotificationToHistory(notifTitle, notifBody, achatId, date);
  
  return id;
}
