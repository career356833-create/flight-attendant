export type AirlineBusinessModel = 'full_service' | 'low_cost' | 'hybrid' | 'regional'
export type AirlineRegion = 'asia_pacific' | 'middle_east' | 'europe' | 'north_america' | 'latin_america' | 'africa' | 'other'

export type Airline = {
  id: string
  name: string
  countryCode: string
  region: AirlineRegion
  businessModel: AirlineBusinessModel
  aliases: string[]
  recruitmentLanguages: string[]
  description?: string
}

export type AirlineSelection =
  | { id: string; name: string; customAirline?: never }
  | { id: 'custom_airline'; name: string; customAirline: string }
  | { id: 'undecided_airline'; name: string; customAirline?: never }

const airline = (id: string, name: string, countryCode: string, region: AirlineRegion, businessModel: AirlineBusinessModel, aliases: string[], recruitmentLanguages: string[]): Airline => ({ id, name, countryCode, region, businessModel, aliases, recruitmentLanguages })

export const airlines: Airline[] = [
  airline('korean_air', 'Korean Air', 'KR', 'asia_pacific', 'full_service', ['대한항공', 'KAL'], ['Korean', 'English']),
  airline('asiana_airlines', 'Asiana Airlines', 'KR', 'asia_pacific', 'full_service', ['아시아나항공', 'Asiana'], ['Korean', 'English']),
  airline('singapore_airlines', 'Singapore Airlines', 'SG', 'asia_pacific', 'full_service', ['SIA', 'SQ'], ['English']),
  airline('cathay_pacific', 'Cathay Pacific', 'HK', 'asia_pacific', 'full_service', ['Cathay', 'CX'], ['English', 'Cantonese', 'Mandarin']),
  airline('ana', 'ANA', 'JP', 'asia_pacific', 'full_service', ['All Nippon Airways', '全日空'], ['Japanese', 'English']),
  airline('japan_airlines', 'Japan Airlines', 'JP', 'asia_pacific', 'full_service', ['JAL', '日本航空'], ['Japanese', 'English']),
  airline('qantas', 'Qantas', 'AU', 'asia_pacific', 'full_service', ['QF'], ['English']),
  airline('air_new_zealand', 'Air New Zealand', 'NZ', 'asia_pacific', 'full_service', ['Air NZ', 'ANZ'], ['English']),
  airline('airasia', 'AirAsia', 'MY', 'asia_pacific', 'low_cost', ['Air Asia', 'AK'], ['English', 'Malay']),
  airline('jetstar', 'Jetstar', 'AU', 'asia_pacific', 'low_cost', ['Jetstar Airways', 'JQ'], ['English']),
  airline('cebu_pacific', 'Cebu Pacific', 'PH', 'asia_pacific', 'low_cost', ['CebuPac', '5J'], ['English', 'Filipino']),
  airline('vietjet_air', 'VietJet Air', 'VN', 'asia_pacific', 'low_cost', ['VietJet', 'VJ'], ['Vietnamese', 'English']),
  airline('scoot', 'Scoot', 'SG', 'asia_pacific', 'low_cost', ['TR'], ['English']),
  airline('peach_aviation', 'Peach Aviation', 'JP', 'asia_pacific', 'low_cost', ['Peach', 'MM'], ['Japanese', 'English']),
  airline('jeju_air', 'Jeju Air', 'KR', 'asia_pacific', 'low_cost', ['제주항공', 'Jeju'], ['Korean', 'English']),
  airline('tway_air', "T'way Air", 'KR', 'asia_pacific', 'low_cost', ['티웨이항공', 'Tway'], ['Korean', 'English']),
  airline('jin_air', 'Jin Air', 'KR', 'asia_pacific', 'low_cost', ['진에어', 'JinAir'], ['Korean', 'English']),
  airline('air_busan', 'Air Busan', 'KR', 'asia_pacific', 'regional', ['에어부산'], ['Korean', 'English']),
  airline('air_seoul', 'Air Seoul', 'KR', 'asia_pacific', 'regional', ['에어서울'], ['Korean', 'English']),
  airline('emirates', 'Emirates', 'AE', 'middle_east', 'full_service', ['EK'], ['English']),
  airline('qatar_airways', 'Qatar Airways', 'QA', 'middle_east', 'full_service', ['Qatar', 'QR'], ['English', 'Arabic']),
  airline('etihad_airways', 'Etihad Airways', 'AE', 'middle_east', 'full_service', ['Etihad', 'EY'], ['English', 'Arabic']),
  airline('saudia', 'Saudia', 'SA', 'middle_east', 'full_service', ['Saudi Arabian Airlines', 'SV'], ['English', 'Arabic']),
  airline('flydubai', 'flydubai', 'AE', 'middle_east', 'hybrid', ['Fly Dubai', 'FZ'], ['English', 'Arabic']),
  airline('air_arabia', 'Air Arabia', 'AE', 'middle_east', 'low_cost', ['G9'], ['English', 'Arabic']),
  airline('lufthansa', 'Lufthansa', 'DE', 'europe', 'full_service', ['LH'], ['German', 'English']),
  airline('air_france', 'Air France', 'FR', 'europe', 'full_service', ['AF'], ['French', 'English']),
  airline('klm', 'KLM', 'NL', 'europe', 'full_service', ['KLM Royal Dutch Airlines'], ['Dutch', 'English']),
  airline('british_airways', 'British Airways', 'GB', 'europe', 'full_service', ['BA'], ['English']),
  airline('turkish_airlines', 'Turkish Airlines', 'TR', 'europe', 'full_service', ['THY', 'TK'], ['Turkish', 'English']),
  airline('iberia', 'Iberia', 'ES', 'europe', 'full_service', ['IB'], ['Spanish', 'English']),
  airline('virgin_atlantic', 'Virgin Atlantic', 'GB', 'europe', 'full_service', ['Virgin', 'VS'], ['English']),
  airline('ryanair', 'Ryanair', 'IE', 'europe', 'low_cost', ['FR'], ['English']),
  airline('easyjet', 'easyJet', 'GB', 'europe', 'low_cost', ['Easy Jet', 'U2'], ['English']),
  airline('wizz_air', 'Wizz Air', 'HU', 'europe', 'low_cost', ['Wizz', 'W6'], ['English']),
  airline('delta_air_lines', 'Delta Air Lines', 'US', 'north_america', 'full_service', ['Delta', 'DL'], ['English']),
  airline('united_airlines', 'United Airlines', 'US', 'north_america', 'full_service', ['United', 'UA'], ['English']),
  airline('american_airlines', 'American Airlines', 'US', 'north_america', 'full_service', ['American', 'AA'], ['English']),
  airline('southwest_airlines', 'Southwest Airlines', 'US', 'north_america', 'low_cost', ['Southwest', 'WN'], ['English']),
  airline('air_canada', 'Air Canada', 'CA', 'north_america', 'full_service', ['AC'], ['English', 'French']),
  airline('jetblue', 'JetBlue', 'US', 'north_america', 'hybrid', ['Jet Blue', 'B6'], ['English']),
  airline('alaska_airlines', 'Alaska Airlines', 'US', 'north_america', 'full_service', ['Alaska', 'AS'], ['English']),
  airline('latam_airlines', 'LATAM Airlines', 'CL', 'latin_america', 'full_service', ['LATAM', 'LA'], ['Spanish', 'Portuguese', 'English']),
  airline('avianca', 'Avianca', 'CO', 'latin_america', 'full_service', ['AV'], ['Spanish', 'English']),
  airline('copa_airlines', 'Copa Airlines', 'PA', 'latin_america', 'full_service', ['Copa', 'CM'], ['Spanish', 'English']),
  airline('aeromexico', 'Aeromexico', 'MX', 'latin_america', 'full_service', ['AeroMexico', 'AM'], ['Spanish', 'English']),
  airline('ethiopian_airlines', 'Ethiopian Airlines', 'ET', 'africa', 'full_service', ['Ethiopian', 'ET'], ['English']),
  airline('kenya_airways', 'Kenya Airways', 'KE', 'africa', 'full_service', ['KQ'], ['English', 'Swahili']),
  airline('south_african_airways', 'South African Airways', 'ZA', 'africa', 'full_service', ['SAA', 'SA'], ['English']),
  airline('rwandair', 'RwandAir', 'RW', 'africa', 'full_service', ['Rwand Air', 'WB'], ['English', 'French']),
  airline('china_airlines', 'China Airlines', 'TW', 'asia_pacific', 'full_service', ['CAL', 'CI'], ['Mandarin', 'English']),
  airline('eva_air', 'EVA Air', 'TW', 'asia_pacific', 'full_service', ['EVA Airways', 'BR'], ['Mandarin', 'English']),
  airline('thai_airways', 'Thai Airways', 'TH', 'asia_pacific', 'full_service', ['THAI', 'TG'], ['Thai', 'English']),
  airline('malaysia_airlines', 'Malaysia Airlines', 'MY', 'asia_pacific', 'full_service', ['MAS', 'MH'], ['Malay', 'English']),
  airline('garuda_indonesia', 'Garuda Indonesia', 'ID', 'asia_pacific', 'full_service', ['Garuda', 'GA'], ['Indonesian', 'English']),
  airline('philippine_airlines', 'Philippine Airlines', 'PH', 'asia_pacific', 'full_service', ['PAL', 'PR'], ['Filipino', 'English']),
  airline('indigo', 'IndiGo', 'IN', 'asia_pacific', 'low_cost', ['6E'], ['Hindi', 'English']),
  airline('air_india', 'Air India', 'IN', 'asia_pacific', 'full_service', ['AI'], ['Hindi', 'English']),
  airline('swiss', 'SWISS', 'CH', 'europe', 'full_service', ['Swiss International Air Lines', 'LX'], ['German', 'French', 'Italian', 'English']),
  airline('finnair', 'Finnair', 'FI', 'europe', 'full_service', ['AY'], ['Finnish', 'English']),
]

export const airlineById = new Map(airlines.map((item) => [item.id, item]))

export function findAirlineByLegacyValue(value: string): Airline | undefined {
  const normalized = value.trim().toLowerCase().replace(/[.'’\s-]/g, '')
  return airlines.find((item) => [item.name, ...item.aliases].some((candidate) => candidate.toLowerCase().replace(/[.'’\s-]/g, '') === normalized))
}
