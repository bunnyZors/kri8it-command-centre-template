import instance from "../config/instance.json" with { type: "json" };
import policy from "../config/planning-policy.json" with { type: "json" };
export { instance, policy };
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const daysLabel = days => days.length === 7 ? "Every day" : days.join() === "1,2,3,4,5" ? "Mon–Fri" : days.map(d => dayNames[d]).join(", ");
export const scheduleLabel = () => instance.schedule.enabled ? `${instance.schedule.times.join(" & ")} · ${daysLabel(instance.schedule.days)}` : "Not scheduled";
export const hoursLabel = () => `${daysLabel(policy.workingDays)} · ${String(policy.startHour).padStart(2,"0")}:00–${String(policy.endHour).padStart(2,"0")}:00 ${instance.timezone} · suggestions only`;
