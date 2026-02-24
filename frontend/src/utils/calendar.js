import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Generate an .ics calendar file and trigger download.
 * Uses data URI approach for maximum browser compatibility.
 */
export const downloadICS = (event) => {
    if (!event || !event.eventStartDate) {
        console.error('downloadICS: event or eventStartDate is missing', event);
        return;
    }

    const start = dayjs(event.eventStartDate);
    const end = event.eventEndDate ? dayjs(event.eventEndDate) : start.add(2, 'hour');
    const now = dayjs();

    // Format as ICS date-time (local time)
    const fmt = (d) => d.format('YYYYMMDDTHHmmss');

    // Strip characters that break ICS parsing
    const clean = (s) => {
        if (!s) return '';
        return s.replace(/[\r\n]+/g, ' ').replace(/[,;\\]/g, ' ').trim();
    };

    const uid = 'felicity-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '@felicity.iiit.ac.in';
    const summary = clean(event.name || 'Event');
    const desc = clean((event.description || '').substring(0, 150));

    // Build ICS content line by line
    var content = '';
    content += 'BEGIN:VCALENDAR\r\n';
    content += 'VERSION:2.0\r\n';
    content += 'CALSCALE:GREGORIAN\r\n';
    content += 'METHOD:PUBLISH\r\n';
    content += 'PRODID:-//Felicity//EN\r\n';
    content += 'BEGIN:VEVENT\r\n';
    content += 'UID:' + uid + '\r\n';
    content += 'DTSTAMP:' + fmt(now) + '\r\n';
    content += 'DTSTART:' + fmt(start) + '\r\n';
    content += 'DTEND:' + fmt(end) + '\r\n';
    content += 'SUMMARY:' + summary + '\r\n';
    if (desc) {
        content += 'DESCRIPTION:' + desc + '\r\n';
    }
    content += 'STATUS:CONFIRMED\r\n';
    content += 'END:VEVENT\r\n';
    content += 'END:VCALENDAR\r\n';

    // Use data URI for download — more reliable than Blob on many browsers
    var encodedContent = encodeURIComponent(content);
    var dataUri = 'data:text/calendar;charset=utf-8,' + encodedContent;

    var link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', (event.name || 'event').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') + '.ics');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup after a short delay
    setTimeout(function () {
        document.body.removeChild(link);
    }, 100);
};

/**
 * Open Google Calendar with pre-filled event details
 */
export const openGoogleCalendar = (event) => {
    if (!event || !event.eventStartDate) return;

    const start = dayjs(event.eventStartDate);
    const end = event.eventEndDate ? dayjs(event.eventEndDate) : start.add(2, 'hour');

    const fmt = (d) => d.format('YYYYMMDDTHHmmss');

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.name || 'Event',
        dates: fmt(start) + '/' + fmt(end),
        details: (event.description || '').substring(0, 200),
    });

    window.open('https://calendar.google.com/calendar/render?' + params.toString(), '_blank');
};

/**
 * Open Microsoft Outlook Calendar with pre-filled event details
 */
export const openOutlookCalendar = (event) => {
    if (!event || !event.eventStartDate) return;

    const start = dayjs(event.eventStartDate);
    const end = event.eventEndDate ? dayjs(event.eventEndDate) : start.add(2, 'hour');

    const fmt = (d) => d.format('YYYY-MM-DDTHH:mm:ss');

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: event.name || 'Event',
        startdt: fmt(start),
        enddt: fmt(end),
        body: (event.description || '').substring(0, 200),
    });

    window.open('https://outlook.live.com/calendar/0/deeplink/compose?' + params.toString(), '_blank');
};
