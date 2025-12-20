const duaBank = [
  "Rabbi zidni 'ilman (O Lord, increase me in knowledge).",
  "Hasbunallahu wa ni'mal wakeel (Allah is sufficient for us).",
  "Rabbi-shrah li sadri (My Lord, expand for me my breast).",
  "Rabbana atina fid-dunya hasanatan (Lord, give us good in this world).",
  "Ya Muqallibal qulub, thabbit qalbi (O Turner of hearts, keep my heart firm).",
  "Subhanallahi wa bihamdihi (Glory be to Allah and Praise be to Him).",
  "Alhamdulillah for everything."
];

const dailyMessages = {
  0: { title: "Sunday Reflection 🤍", icon: "🌙" },
  1: { title: "Monday Motivation ✨", icon: "🚀" },
  2: { title: "Tuesday Grace 🌿", icon: "🍃" },
  3: { title: "Wednesday Love 🌸", icon: "💗" },
  4: { title: "Thursday Hope 🕯️", icon: "✨" },
  5: { title: "Friday Blessings 🤲", icon: "🕌" },
  6: { title: "Saturday Peace 🌙", icon: "⭐" }
};

export const scheduleDailyDua = async () => {
  const isEnabled = localStorage.getItem("dua_reminder") === "true";
  if (!isEnabled || Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker.ready;
  const lastShown = localStorage.getItem("last_dua_notif_time");
  const now = new Date();
  
  const lastDate = lastShown ? new Date(parseInt(lastShown)).toDateString() : null;
  const currentDate = now.toDateString();

  if (lastDate !== currentDate) {
    const dayIndex = now.getDay();
    const dayHeader = dailyMessages[dayIndex];
    
    // Pick a random Dua from the bank
    const randomDua = duaBank[Math.floor(Math.random() * duaBank.length)];

    registration.active.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      title: `${dayHeader.title}`,
      body: `${randomDua}`, // The notification body is now the random Dua
      delay: 8000 
    });
    
    localStorage.setItem("last_dua_notif_time", now.getTime().toString());
  }
};