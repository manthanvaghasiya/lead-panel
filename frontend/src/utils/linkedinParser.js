/**
 * Client-Side Smart LinkedIn Text Parser
 * Provides resilient fallback extraction if the backend AI service is temporarily offline or encounters a network error.
 */

export function heuristicExtract(text) {
  const result = {
    name: '',
    position: '',
    company: '',
    location: '',
    reason: 'Freelance BDE Opportunity',
    linkedinUrl: '',
    mobile: '',
    email: '',
    status: 'In Conversation',
    priority: 'Warm',
    meetingLink: '',
    meetingTimeStr: '',
    commission: '',
    dealTerms: '',
    skills: [],
    notes: '',
    summary: '',
    conversationLog: []
  };

  if (!text || typeof text !== 'string') return result;

  // 1. Extract LinkedIn URL (prefer vanity URL without 'ACoAA' hash)
  const allLinkedinUrls = [...text.matchAll(/https:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-\%]+)/gi)];
  if (allLinkedinUrls.length > 0) {
    const vanityUrl = allLinkedinUrls.find(u => !u[1].startsWith('ACoAA'));
    result.linkedinUrl = vanityUrl ? vanityUrl[0] : allLinkedinUrls[0][0];
  }

  // 2. Extract Google Meet / Zoom links
  const meetMatch = text.match(/https:\/\/meet\.google\.com\/[a-z0-9\-]+/i) || text.match(/https:\/\/[a-z0-9\.]*zoom\.us\/j\/[a-zA-Z0-9\?\=\_\-]+/i);
  if (meetMatch) {
    result.meetingLink = meetMatch[0];
    result.status = 'Meeting Scheduled';
    result.priority = 'Hot';
  }

  // 3. Extract Email (exclude internal Webiox or placeholder emails)
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailMatches) {
    const leadEmail = emailMatches.find(e => !e.toLowerCase().includes('webiox'));
    if (leadEmail) result.email = leadEmail.trim();
  }

  // 4. Extract Mobile / Phone number (explicitly avoid Manthan's phone 8347448241)
  const phoneMatches = text.match(/(?:(?:\+91|91|0)?[ -]?)?([6-9]\d{9})\b/g) || [];
  for (const pm of phoneMatches) {
    const cleanDigits = pm.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length === 10 && cleanDigits !== '8347448241') {
      result.mobile = cleanDigits;
      break;
    }
  }

  // 5. Extract Name
  // A. Check markdown links [Name](https://www.linkedin.com/...)
  const mdMatches = [...text.matchAll(/\[([A-Z][a-zA-Z\s\.\-]+)\]\((?:https:\/\/www\.linkedin\.com\/in\/[^)]+)\)/g)];
  const validNames = mdMatches
    .map(m => m[1].trim())
    .filter(n =>
      !n.toLowerCase().includes('status') &&
      !n.toLowerCase().includes('view') &&
      !n.toLowerCase().includes('manthan') &&
      !n.toLowerCase().includes('open to work') &&
      !n.toLowerCase().includes('contact') &&
      !n.toLowerCase().includes('experience') &&
      n.length > 2
    );

  if (validNames.length > 0) {
    result.name = validNames[0];
  } else {
    // B. Check lines before (She/Her) or (He/Him)
    const pronounMatch = text.match(/([A-Z][a-zA-Z\s]{2,35})\s*\((?:She\/Her|He\/Him|They\/Them)\)/i);
    if (pronounMatch && !pronounMatch[1].toLowerCase().includes('manthan')) {
      result.name = pronounMatch[1].trim();
    } else {
      // C. Check "sent the following message"
      const sentMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+sent the following message/i);
      if (sentMatch && !sentMatch[1].toLowerCase().includes('manthan')) {
        result.name = sentMatch[1].trim();
      }
    }
  }

  // 6. Extract Headline / Position
  const headlineMatch = text.match(/(Business Development Executive[^\n\r]+|BDE[^\n\r]+|Marketing Consultant[^\n\r]+|Lead Generation[^\n\r]+|Software Engineer[^\n\r]+|Full Stack[^\n\r]+|[A-Za-z\s]+(?:Executive|Specialist|Lead|Developer|Designer|Director|Consultant)[^\n\r]+)/i);
  if (headlineMatch) {
    result.position = headlineMatch[0].trim().replace(/\s*·.*$/, '').slice(0, 150);
  }

  // 7. Extract Company
  const companyKeywords = text.match(/(?:at|@|company|Experience\s*\[\s*[^\]]+)\s*([A-Za-z0-9\s]+(?:Infotech|Solutions|Technologies|Service|Services|LLP|Pvt|Ltd|Digital|Studio|Media))/i);
  if (companyKeywords) {
    result.company = companyKeywords[1].trim();
  } else if (/WhiteStone Infotech/i.test(text)) {
    result.company = 'WhiteStone Infotech';
  } else if (/Petpooja/i.test(text)) {
    result.company = 'Petpooja';
  } else if (/Mantras2Success/i.test(text)) {
    result.company = 'Mantras2Success.com';
  } else if (/Royal IT Service/i.test(text)) {
    result.company = 'Royal IT Service';
  } else if (/Softol Solutions/i.test(text)) {
    result.company = 'Softol Solutions';
  } else if (/Vasundhara Infotech/i.test(text)) {
    result.company = 'Vasundhara Infotech';
  }

  // 8. Extract Location
  const locMatch = text.match(/([A-Za-z\s]+,\s*(?:Gujarat|Madhya Pradesh|Maharashtra|Delhi|Karnataka|Tamil Nadu|Rajasthan|Uttar Pradesh|Punjab|India))/i);
  if (locMatch) {
    result.location = locMatch[1].trim();
  } else if (text.includes('Surat')) {
    result.location = 'Surat, Gujarat, India';
  } else if (text.includes('Ahmedabad')) {
    result.location = 'Ahmedabad, Gujarat, India';
  } else if (text.includes('Indore')) {
    result.location = 'Indore, Madhya Pradesh, India';
  }

  // 9. Commission & Deal Terms
  const commMatch = text.match(/(?:commission|payout|referral)\D{0,20}(\d+(?:\s*(?:–|-|to)\s*\d+)?%)/i) ||
                    text.match(/(\d+(?:\s*(?:–|-|to)\s*\d+)?%)\s*(?:commission|referral|milestone)/i) ||
                    text.match(/up to (\d+%)/i);
  if (commMatch) {
    result.commission = commMatch[1];
    result.dealTerms = `Milestone referral commission: ${commMatch[1]} on closed client builds routed to Webiox.`;
  }

  // 10. Reason Detection
  if (/Active Partner|Closed \/ Partnered|Freelancer BDE\b/i.test(text)) {
    result.reason = 'Freelancer BDE';
  } else if (/Freelance BDE|Commission basis|BDE Opportunity/i.test(text)) {
    result.reason = 'Freelance BDE Opportunity';
  } else if (/Partnership|Collaboration|White-label/i.test(text)) {
    result.reason = 'Agency Partnership';
  }

  // 11. Status & Priority Detection (Aligned with 4-Step Standard Pipeline)
  // Step 1: LinkedIn Chat -> Step 2: 10-Min Google Meet -> Step 3: Demo & Finalize -> Step 4: WhatsApp Handoff
  if (/call me directly|between 2 to 4|meeting scheduled|locked in|meet\.google\.com/i.test(text)) {
    result.status = 'Meeting Scheduled';
    result.priority = 'Hot';
  } else if (/Closed \/ Partnered|Partnered|deal closed/i.test(text)) {
    result.status = 'Closed / Partnered';
    result.priority = 'Hot';
  } else if (/demo completed|call completed|interviewed/i.test(text)) {
    result.status = 'Call Completed';
    result.priority = 'Hot';
  } else if (/interested|sure|sounds interesting|open for the|open to a quick|let's connect/i.test(text)) {
    result.status = 'In Conversation';
    result.priority = 'Warm';
  }

  // 12. Extract Skills
  const skillList = [
    'Lead Generation', 'B2B Sales', 'Client Acquisition', 'MERN Stack',
    'Full-Stack Development', 'Sales Strategy', 'Apollo.io', 'Cold Calling',
    'Email Marketing', 'CRM', 'Consultative Selling', 'Market Research',
    'Customer Service', 'AWS', 'UI/UX Design', 'Technical Support',
    'Flutter', 'Android', 'Kotlin', 'Java', 'Dart', 'Mobile App Development'
  ];
  result.skills = skillList.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(text));

  // 13. Generate Executive Summary & Notes conforming to SOP
  if (result.status === 'Meeting Scheduled') {
    result.summary = `${result.name || 'Contact'} (${result.position || 'Professional'}${result.company ? ' at ' + result.company : ''}) has a 10-minute Google Meet locked in. Step 2 of Outreach Funnel.`;
  } else if (result.status === 'Closed / Partnered') {
    result.summary = `${result.name || 'Partner'} finalized partnership with Webiox. Step 4 Active Partner: WhatsApp enabled for live client lead handoffs.`;
  } else {
    result.summary = `${result.name || 'Candidate'} (${result.position || 'Professional'}${result.company ? ' at ' + result.company : ''}) engaged on LinkedIn regarding ${result.reason}. Standard Funnel Next Step: Request email to schedule 10-minute Google Meet (WhatsApp unlocked post-Meet for active leads).`;
  }

  result.notes = `• Standard Funnel Progress:
  1. LinkedIn Chat (Interest / Pitch) → ${result.status === 'In Conversation' ? 'In Progress / Interest Shown' : 'Completed'}
  2. 10-Minute Google Meet (Lock time & email) → ${result.status === 'Meeting Scheduled' ? 'Scheduled' : 'Next Step: Propose time & collect email'}
  3. Demo & Finalize Partnership / Deal → Showcase Webiox tech builds & lock 15%–20% commission
  4. WhatsApp (Active Lead Handoffs) → Only shared after Meet for routing active deals

• Role & Organization:
  - Role: ${result.position || 'N/A'}
  - Company: ${result.company || 'N/A'}
  - Location: ${result.location || 'N/A'}
  - Terms: ${result.dealTerms || '15%–20% milestone referral fee on client builds'}
  - Contact Channel: ${result.email ? 'Email: ' + result.email : 'LinkedIn DM (Request email for 10-min Meet)'}`;

  return result;
}
