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
  managerPhone?: string;
}

export const sendWhatsappMessage = async (phone: string, message: string) => {
  try {
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    
    const settings = docSnap.data()?.whatsappSettings as WhatsappSettings;
    if (!settings?.enabled || !phone) return false;

    // Format phone to international format without + or 00
    let formattedPhone = phone.replace(/\D/g, '');
    
    // Auto format Saudi local numbers (05xxxxxxxx) to (9665xxxxxxxx)
    if (formattedPhone.startsWith('05') && formattedPhone.length === 10) {
      formattedPhone = '966' + formattedPhone.substring(1);
    }
    
    if (formattedPhone.length < 9) return false;
    
    // Only using the local server or deployed local server (wwebjs approach)
    const baseUrl = settings.apiUrl?.replace(/\/$/, '') || '/api/whatsapp';
    const response = await fetch(`${baseUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone, message: `${message}\n\n― ${settings.senderName || 'النظام الآلي'}` })
    });

    if (!response.ok) {
        console.log(`[WhatsApp Local Mock] Sent to ${formattedPhone}: ${message} (Fallback, real API missing or failed)`);
        return false;
    }

    return true;
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return false; // Silently fail to not break the app
  }
};

export const sendWhatsappToManager = async (message: string) => {
  try {
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    
    const settings = docSnap.data()?.whatsappSettings as WhatsappSettings;
    if (settings?.managerPhone) {
      return await sendWhatsappMessage(settings.managerPhone, message);
    }
    return false;
  } catch (error) {
    console.error('Error sending to manager:', error);
    return false;
  }
};

