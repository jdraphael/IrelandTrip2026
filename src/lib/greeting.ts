export function getTimeOfDayGreeting(date = new Date(), familyName = 'Raphael family') {
  const hour = date.getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Good ${period}, ${familyName}`;
}
