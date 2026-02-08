export type TimeOfDay = "morning" | "afternoon" | "evening" | "night"
export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 18) return "afternoon"
  if (hour >= 18 && hour < 22) return "evening"
  return "night"
}

export function getDefaultMealType(): MealType {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return "breakfast"
  if (hour >= 11 && hour < 15) return "lunch"
  if (hour >= 17 && hour < 22) return "dinner"
  return "snack"
}

export function getGreeting(name: string): string {
  const tod = getTimeOfDay()
  switch (tod) {
    case "morning": return `Good morning, ${name}!`
    case "afternoon": return `Good afternoon, ${name}!`
    case "evening": return `Good evening, ${name}!`
    case "night": return `Good night, ${name}!`
  }
}

export function shouldShowSleepButton(): boolean {
  const hour = new Date().getHours()
  return hour >= 20 || hour < 5
}
