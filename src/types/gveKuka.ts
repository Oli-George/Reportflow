export interface GveKukaHourlyEntry {
  id: string
  time: string // 12-hour format e.g. "06:00 AM", "07:00 AM"
  pv: {
    volt: string
    curr: string
    power: string
    energy: string
  }
  battery: {
    volt: string
    curr: string
    soc: string
    soh: string
  }
  load: {
    l1_v: string
    l1_a: string
    l2_v: string
    l2_c: string
    l3_v: string
    l3_c: string
    power: string
    energy: string
  }
  grid: {
    l1_v: string
    l1_a: string
    l2_v: string
    l2_c: string
    l3_v: string
    l3_c: string
    power: string
    energy: string
  }
  spd: {
    in: string
    out: string
  }
  cooling: {
    ac1: string
    ac2: string
  }
  operatorName: string
  operatorSignature?: string
}

export interface GveKukaRecordData {
  siteName: string
  title: string
  date: string
  day: string
  year: string
  entries: GveKukaHourlyEntry[]
}

// Default initial hourly entries in 12-hour format
export const DEFAULT_12HR_TIMES = [
  '06:00 AM',
  '07:00 AM',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
]

export function createEmptyGveEntry(time: string, idSuffix: number): GveKukaHourlyEntry {
  return {
    id: `entry-${Date.now()}-${idSuffix}`,
    time,
    pv: { volt: '', curr: '', power: '', energy: '' },
    battery: { volt: '', curr: '', soc: '', soh: '' },
    load: { l1_v: '', l1_a: '', l2_v: '', l2_c: '', l3_v: '', l3_c: '', power: '', energy: '' },
    grid: { l1_v: '', l1_a: '', l2_v: '', l2_c: '', l3_v: '', l3_c: '', power: '', energy: '' },
    spd: { in: 'GOOD', out: 'GOOD' },
    cooling: { ac1: 'ON', ac2: 'ON' },
    operatorName: '',
    operatorSignature: '',
  }
}
