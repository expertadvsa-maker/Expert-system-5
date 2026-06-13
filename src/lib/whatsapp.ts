import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface WhatsappSettings {
  enabled: boolean;
  provider: 'evolution' | 'greenapi' | 'ultramsg' | 'wwebjs';
  apiUrl: string;
  instanceId: string;
  token: string;
  senderName: string;
  notifyClientNewProject: boolean;
  notifyClientInvoice: boolean;
  notifyEmployeeMeeting: boolean;
}

export const sendWhatsappMessage = async (phone: string, message: string) => {
  try {
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    
    const settings = docSnap.data()?.whatsappSettings as WhatsappSettings;
    if (!settings?.enabled || !settings.apiUrl || !phone) return false;

    // Format phone to international format without + or 00
    // Try to ensure length > 9 to avoid sending to weird numbers
    const formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length < 9) return false;
    
    // Depending on provider, use different API structures
    if (settings.provider === 'greenapi') {
      await fetch(`${settings.apiUrl}/waInstance${settings.instanceId}/sendMessage/${settings.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${formattedPhone}@c.us`,
          message: `${message}\n\n― ${settings.senderName || 'النظام الآلي'}`
        })
      });
    } 
    else if (settings.provider === 'evolution') {
      await fetch(`${settings.apiUrl}/message/sendText/${settings.instanceId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': settings.token
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: `${message}\n\n― ${settings.senderName || 'النظام الآلي'}`
        })
      });
    }
    else if (settings.provider === 'ultramsg') {
      const qs = new URLSearchParams({
        token: settings.token,
        to: formattedPhone,
        body: `${message}\n\n― ${settings.senderName || 'النظام الآلي'}`,
      });
      await fetch(`${settings.apiUrl}/${settings.instanceId}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: qs.toString()
      });
    }
    // Generic fallback or local mock for wwebjs
    else {
      // Use local server endpoint
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, message: `${message}\n\n― ${settings.senderName || 'النظام الآلي'}` })
      });
      if (!response.ok) {
         console.log(`[WhatsApp Local Mock] Sent to ${formattedPhone}: ${message} (Fallback, real API missing)`);
         return false;
      }
    }

    return true;
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return false; // Silently fail to not break the app
  }
};
