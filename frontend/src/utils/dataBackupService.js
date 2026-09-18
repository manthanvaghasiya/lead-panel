import * as XLSX from 'xlsx';
import { getLinkedInBackup, restoreLinkedInBackup } from '../api/apiClient';

/**
 * Download raw JSON database snapshot for complete machine disaster recovery
 */
export async function downloadJsonBackup() {
  const res = await getLinkedInBackup();
  const data = res.data;

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `webiox_crm_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return link.download;
}

/**
 * 1-Click Excel Spreadsheet Export (.xlsx)
 */
export function exportCrmExcel(contacts = []) {
  const rows = contacts.map((c, idx) => ({
    'ID': idx + 1,
    'Full Name': c.name || '',
    'Role / Position': c.position || '',
    'Company': c.company || '',
    'Location': c.location || '',
    'Funnel Stage': c.status || 'In Conversation',
    'Priority': c.priority || 'Warm',
    'Category': c.reason || 'Agency Partnership',
    'Mobile / WhatsApp': c.mobile ? `+91 ${c.mobile}` : '',
    'Email Address': c.email || '',
    'LinkedIn URL': c.linkedinUrl || '',
    'Agreed Commission': c.commission || '15%–20%',
    'Deal Scope / Terms': c.dealTerms || '',
    'Technical Skills': (c.skills || []).join(', '),
    'Scheduled Meeting Date': c.meetingDate ? new Date(c.meetingDate).toLocaleString('en-IN') : '',
    'Google Meet Link': c.meetingLink || '',
    'Executive Summary': c.summary || '',
    'Strategic Notes': c.notes || '',
    'Messages Exchanged': (c.conversationLog || []).length
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CRM Contacts');

  const filename = `webiox_crm_directory_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
  return filename;
}

/**
 * Restore database from uploaded JSON backup
 */
export function restoreDatabaseFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No backup file provided'));

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const contacts = Array.isArray(parsed) ? parsed : (parsed.contacts || []);
        
        if (!contacts || contacts.length === 0) {
          throw new Error('Backup file does not contain a valid contacts array.');
        }

        const res = await restoreLinkedInBackup({ contacts });
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read backup file.'));
    reader.readAsText(file);
  });
}
