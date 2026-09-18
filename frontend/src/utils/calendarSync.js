/**
 * Google Calendar & Meet Sync Utility
 * Parses raw Google Calendar invites, emails, and snippets
 * Auto-generates Google Meet links and 1-click Google Calendar event URLs
 */

export const SAMPLE_CALENDAR_INVITE = `Webiox <> Softol Solutions | Technical Partnership Intro (Manthan & MG)
Monday, September 21⋅2:30 – 2:45pm
[Join with Google Meet](https://meet.google.com/krj-seai-ydt?authuser=0&hs=122)
meet.google.com/krj-seai-ydt
2 guests
2 yes
Manthan Vaghasiya
Organizer
mgpatel0077@gmail.com
Hi mg, Looking forward to our brief sync on Monday. Quick Agenda (10–15 mins): Brief overview of Softol Solutions' ongoing client needs & marketing scope. Webiox's full-stack engineering & custom software development capabilities. Exploring collaboration models (technical fulfillment / referral alignment). See you on Monday! Best regards, Manthan Vaghasiya Founder, Webiox +91 8347448241
30 minutes before
Manthan Vaghasiya`;

/**
 * Generates a real, valid Google Meet URL structure (xxx-yyyy-zzz)
 * e.g. https://meet.google.com/krj-seai-ydt
 */
export function generateGoogleMeetLink() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const rand = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `https://meet.google.com/${rand(3)}-${rand(4)}-${rand(3)}`;
}

export function parseGoogleCalendarSnippet(text, contacts = []) {
  if (!text || typeof text !== 'string') return null;

  const result = {
    title: '',
    startDate: null,
    endDate: null,
    meetUrl: '',
    guestEmail: '',
    guestName: '',
    company: '',
    agenda: '',
    matchedContact: null,
    matchConfidence: 'none' // 'high', 'medium', 'low', 'none'
  };

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  result.title = lines[0];

  // 1. Extract Google Meet URL (clean query params like ?authuser=0...)
  const meetMatch = text.match(/https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  if (meetMatch) {
    result.meetUrl = `https://meet.google.com/${meetMatch[1].toLowerCase()}`;
  } else {
    const rawMeet = text.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    if (rawMeet) {
      result.meetUrl = `https://meet.google.com/${rawMeet[1].toLowerCase()}`;
    }
  }

  // 2. Extract Guest Email (excluding organizer webiox)
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const externalEmail = emailMatches.find(e => !e.toLowerCase().includes('webiox'));
  if (externalEmail) {
    result.guestEmail = externalEmail.toLowerCase().trim();
  }

  // 3. Extract Contact Name from body if present
  // e.g. "Contact: Aayushi Paliwal", "Interaction - Aayushi Paliwal"
  const contactNameMatch = text.match(/(?:Contact|Interaction)\s*[-:]\s*([A-Z][a-zA-Z\s]{2,30}?)(?=\s*[\(\[,\n]|$)/i);
  if (contactNameMatch && !contactNameMatch[1].toLowerCase().includes('manthan')) {
    result.guestName = contactNameMatch[1].trim();
  }

  // 3b. Extract Phone number
  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b\d{10}\b/);
  if (phoneMatch) {
    result.phone = phoneMatch[0].replace(/\D/g, '').slice(-10);
  }

  // 4. Extract Date and Time Range
  // Example: "Monday, September 21⋅2:30 – 2:45pm" or "Saturday, September 19⋅2:00 – 2:30pm"
  const dateRegex = /(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[,\s]+)?([A-Za-z]+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?[,\s⋅·\.]+(\d{1,2}(?::\d{2})?)\s*(?:am|pm)?\s*[–\-—]\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i;
  const dateMatch = text.match(dateRegex);

  const monthNames = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };

  if (dateMatch) {
    const monthStr = dateMatch[2].toLowerCase();
    const day = parseInt(dateMatch[3], 10);
    const currentYear = new Date().getFullYear();
    const year = dateMatch[4] ? parseInt(dateMatch[4], 10) : currentYear;
    const startTimeRaw = dateMatch[5];
    const endTimeRaw = dateMatch[6];
    const ampmRaw = (dateMatch[7] || '').toLowerCase();

    const monthIndex = monthNames[monthStr];
    if (monthIndex !== undefined) {
      let [startH, startM] = startTimeRaw.split(':').map(Number);
      startM = startM || 0;
      let isPm = ampmRaw === 'pm';
      if (!ampmRaw && startH < 8) isPm = true;
      if (ampmRaw === 'pm' && startH < 12) startH += 12;
      if (ampmRaw === 'am' && startH === 12) startH = 0;

      if (!dateMatch[0].match(/am/i) && (ampmRaw === 'pm' || startH < 8)) {
        if (startH < 12) startH += 12;
      }

      result.startDate = new Date(year, monthIndex, day, startH, startM, 0, 0);

      if (endTimeRaw) {
        let [endH, endM] = endTimeRaw.split(':').map(Number);
        endM = endM || 0;
        if (ampmRaw === 'pm' && endH < 12) endH += 12;
        if (ampmRaw === 'am' && endH === 12) endH = 0;
        result.endDate = new Date(year, monthIndex, day, endH, endM, 0, 0);
      }
    }
  }

  // 5. Extract Company & Guest Name from Title or Greeting
  const titleCompanyMatch = result.title.match(/<>\s*([^|()]+)/i);
  if (titleCompanyMatch) {
    const candidate = titleCompanyMatch[1].trim();
    if (candidate.toLowerCase() !== 'bde') {
      result.company = candidate;
    }
  }

  const titleNamesMatch = result.title.match(/\(([^)]+)\)/);
  if (titleNamesMatch) {
    const names = titleNamesMatch[1].split(/[&,]/).map(n => n.trim());
    const externalName = names.find(n => !n.toLowerCase().includes('manthan'));
    if (externalName && !result.guestName) result.guestName = externalName;
  }

  const greetingMatch = text.match(/Hi\s+([A-Za-z]+)/i);
  if (greetingMatch && !greetingMatch[1].toLowerCase().includes('manthan')) {
    if (!result.guestName) result.guestName = greetingMatch[1].trim();
  }

  // 6. Extract Agenda / Description
  const agendaMatch = text.match(/(?:Quick\s+)?Agenda[^\n]*:([\s\S]*?)(?=(?:See you|Best regards|\d+\s*minutes before|$))/i);
  if (agendaMatch) {
    result.agenda = agendaMatch[0].trim();
  } else {
    const bodyMatch = text.match(/Hi [^,]+,([\s\S]*?)(?=(?:See you|Best regards|\d+\s*minutes before|$))/i);
    if (bodyMatch) {
      result.agenda = bodyMatch[0].trim();
    }
  }

  // 7. Find matching contact from contacts list
  if (contacts && contacts.length > 0) {
    // Priority 1: Email match
    if (result.guestEmail) {
      const emailMatch = contacts.find(c => c.email && c.email.toLowerCase() === result.guestEmail);
      if (emailMatch) {
        result.matchedContact = emailMatch;
        result.matchConfidence = 'high';
      }
    }

    // Priority 2: Phone match
    if (!result.matchedContact && result.phone) {
      const cleanTargetPhone = result.phone;
      const phoneMatch = contacts.find(c => {
        if (!c.mobile) return false;
        const cleanMobile = c.mobile.replace(/\D/g, '').slice(-10);
        return cleanMobile === cleanTargetPhone;
      });
      if (phoneMatch) {
        result.matchedContact = phoneMatch;
        result.matchConfidence = 'high';
      }
    }

    // Priority 3: Name match (bidirectional)
    if (!result.matchedContact && result.guestName) {
      const gLower = result.guestName.toLowerCase();
      const nameMatch = contacts.find(c => {
        if (!c.name) return false;
        const cLower = c.name.toLowerCase();
        return cLower.includes(gLower) || gLower.includes(cLower);
      });
      if (nameMatch) {
        result.matchedContact = nameMatch;
        result.matchConfidence = 'high';
      }
    }

    // Priority 4: Company match
    if (!result.matchedContact && result.company) {
      const compMatch = contacts.find(c => c.company && c.company.toLowerCase().includes(result.company.toLowerCase()));
      if (compMatch) {
        result.matchedContact = compMatch;
        result.matchConfidence = 'medium';
      }
    }
  }

  // 8. Auto-Generate Meet Link if none was detected in text or contact!
  if (!result.meetUrl) {
    if (result.matchedContact?.meetingLink && result.matchedContact.meetingLink.startsWith('http')) {
      result.meetUrl = result.matchedContact.meetingLink;
    } else {
      result.meetUrl = generateGoogleMeetLink();
    }
  }

  // 9. Auto-fix / Format Title if missing person name or has "<>BDE"
  if (result.title.match(/<>\s*BDE\b/i)) {
    const name = result.matchedContact?.name || result.guestName || 'Partner';
    result.title = `Webiox <> ${name}(BDE) | Partnership Catchup`;
  } else if (result.matchedContact) {
    result.title = getMeetingTitle(result.matchedContact, result.title);
  }

  return result;
}

/**
 * Format a Date object into UTC string for Google Calendar render URL:
 * YYYYMMDDTHHmmssZ
 */
function toGCalIso(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generate 1-click Google Calendar Add Event URL
 * Always ensures a valid Google Meet video link is embedded in location and description!
 */
export function generateGoogleCalendarUrl({
  title = 'Webiox Partnership Meeting',
  startDate,
  endDate,
  location = '',
  details = '',
  addGuestEmail = ''
}) {
  if (!startDate) return '';
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 60 * 1000);

  // Auto-generate or format Google Meet URL
  let meetUrl = '';
  if (location && location.startsWith('http')) {
    meetUrl = location;
  } else if (location && location.toLowerCase().includes('meet.google.com')) {
    const codeMatch = location.match(/meet\.google\.com\/[a-z0-9\-]+/i);
    meetUrl = codeMatch ? `https://${codeMatch[0]}` : generateGoogleMeetLink();
  } else {
    meetUrl = generateGoogleMeetLink();
  }

  const cleanSlug = meetUrl.replace(/^https?:\/\//i, '');
  const meetMarkdownHeader = `[Join with Google Meet](${meetUrl})\n${cleanSlug}`;
  
  let cleanDetails = (details || '').trim();
  cleanDetails = cleanDetails.replace(/\[Join with Google Meet\]\([^\)]+\)\s*/gi, '');
  cleanDetails = cleanDetails.replace(/https?:\/\/meet\.google\.com\/[a-z0-9\-]+\s*/gi, '');
  cleanDetails = cleanDetails.replace(/meet\.google\.com\/[a-z0-9\-]+\s*/gi, '');
  cleanDetails = cleanDetails.trim();

  const fullDetails = cleanDetails ? `${meetMarkdownHeader}\n\n${cleanDetails}` : meetMarkdownHeader;

  const datesParam = `${toGCalIso(start)}/${toGCalIso(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: datesParam,
    details: fullDetails,
    location: meetUrl
  });

  if (addGuestEmail) {
    params.append('add', addGuestEmail.trim());
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates personalized meeting title formatted as:
 * Webiox <> Name(Role) | Partnership Catchup
 * e.g. Webiox <> Aayushi Paliwal(BDE) | Partnership Catchup
 */
export function getMeetingTitle(contact, defaultTitle) {
  if (!contact) return defaultTitle || 'Webiox | Partnership Catchup';
  
  const pos = (contact.position || '').toLowerCase();
  const reason = (contact.reason || '').toLowerCase();
  
  let roleTag = '';
  if (pos.includes('bde') || pos.includes('business development') || reason.includes('bde')) {
    roleTag = '(BDE)';
  } else if (pos.includes('marketing') || pos.includes('consultant')) {
    roleTag = '(Marketing)';
  } else if (pos.includes('lead generation') || pos.includes('lead gen')) {
    roleTag = '(Lead Gen)';
  } else if (pos.includes('developer') || pos.includes('engineer')) {
    roleTag = '(Engineer)';
  } else if (pos.includes('founder') || pos.includes('ceo') || pos.includes('director')) {
    roleTag = '(Founder)';
  } else if (contact.company) {
    roleTag = `(${contact.company.replace(/\.com$/i, '').trim()})`;
  }

  const contactName = contact.name || contact.company || 'Partner';
  return `Webiox <> ${contactName}${roleTag} | Partnership Catchup`;
}
