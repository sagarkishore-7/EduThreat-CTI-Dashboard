import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "Unknown";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "N/A";
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAttackCategory(category: string | undefined | null): string {
  if (!category) return "Unknown";
  
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getSeverityColor(severity: string | undefined | null): string {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "text-red-500";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-green-500";
    default:
      return "text-blue-500";
  }
}

export function getAttackTypeColor(attackType: string | undefined | null): string {
  const type = attackType?.toLowerCase() || "";
  
  if (type.includes("ransomware")) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (type.includes("phishing")) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (type.includes("data_breach")) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  if (type.includes("ddos")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (type.includes("malware")) return "bg-pink-500/20 text-pink-400 border-pink-500/30";
  
  return "bg-blue-500/20 text-blue-400 border-blue-500/30";
}

export function getStatusColor(status: string | undefined | null): string {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "suspected":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export function truncate(str: string | undefined | null, length: number): string {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getCountryFlag(country: string | undefined | null, flagEmoji?: string): string {
  // If flag_emoji is provided from API, use it directly
  if (flagEmoji) return flagEmoji;
  
  if (!country) return "🌍";
  
  // If it's a 2-character code, convert to flag emoji
  if (country.length === 2) {
    const codePoints = country
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  
  // For full country names, try to extract code or return globe
  // This is a fallback - ideally the API should provide flag_emoji
  const countryCodeMap: Record<string, string> = {
    "United States": "US",
    "United Kingdom": "GB",
    "Canada": "CA",
    "Australia": "AU",
    "Germany": "DE",
    "France": "FR",
    "Italy": "IT",
    "Spain": "ES",
    "Netherlands": "NL",
    "Belgium": "BE",
    "Switzerland": "CH",
    "Austria": "AT",
    "Sweden": "SE",
    "Norway": "NO",
    "Denmark": "DK",
    "Finland": "FI",
    "Poland": "PL",
    "Czech Republic": "CZ",
    "Ireland": "IE",
    "Portugal": "PT",
    "Greece": "GR",
    "Hungary": "HU",
    "Romania": "RO",
    "Bulgaria": "BG",
    "Croatia": "HR",
    "Slovakia": "SK",
    "Slovenia": "SI",
    "Lithuania": "LT",
    "Latvia": "LV",
    "Estonia": "EE",
    "Luxembourg": "LU",
    "Malta": "MT",
    "Cyprus": "CY",
    "Iceland": "IS",
    "Japan": "JP",
    "China": "CN",
    "India": "IN",
    "South Korea": "KR",
    "Singapore": "SG",
    "Malaysia": "MY",
    "Thailand": "TH",
    "Philippines": "PH",
    "Indonesia": "ID",
    "Vietnam": "VN",
    "New Zealand": "NZ",
    "Brazil": "BR",
    "Mexico": "MX",
    "Argentina": "AR",
    "Chile": "CL",
    "Colombia": "CO",
    "Peru": "PE",
    "South Africa": "ZA",
    "Egypt": "EG",
    "Nigeria": "NG",
    "Kenya": "KE",
    "Israel": "IL",
    "United Arab Emirates": "AE",
    "Saudi Arabia": "SA",
    "Turkey": "TR",
    "Russia": "RU",
    "Ukraine": "UA",
    "Pakistan": "PK",
    "Bangladesh": "BD",
    "Taiwan": "TW",
    "Hong Kong": "HK",
  };
  
  const code = countryCodeMap[country];
  if (code) {
    const codePoints = code
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  
  return "🌍";
}

