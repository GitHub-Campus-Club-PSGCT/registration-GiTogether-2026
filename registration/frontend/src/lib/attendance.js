export const countPresent = (team) => team.members.filter((member) => member.checkedInAt).length;

export const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

const memberMatches = (member, query) => [member.name, member.rollNumber, member.phone, member.email].some((value) => value.toLowerCase().includes(query));

// Expects a trimmed, lowercase search.
export const teamMatches = (team, query) =>
  team.teamName.toLowerCase().includes(query) || team.teamCode.toLowerCase().includes(query) || team.members.some((member) => memberMatches(member, query));
