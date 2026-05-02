/** Pasif / aktif grupları — arayüzde ayrı filtreler. */
export type PartCategory =
  | 'resistor'
  | 'capacitor'
  | 'ic'
  | 'transistor'
  | 'diode'
  | 'connector'
  | 'module'
  | 'led'
  | 'sensor'
  | 'mechanical'

export const CATEGORY_LABELS: Record<PartCategory, string> = {
  resistor: 'Direnç',
  capacitor: 'Kondansatör',
  ic: 'Entegre',
  transistor: 'Transistör',
  diode: 'Diyot',
  connector: 'Konnektör',
  module: 'Modül',
  led: 'LED',
  sensor: 'Sensör',
  mechanical: 'Mekanik',
}

/** Sekme sırası (Tümü hariç). */
export const CATEGORY_ORDER: PartCategory[] = [
  'resistor',
  'capacitor',
  'ic',
  'transistor',
  'diode',
  'connector',
  'module',
  'led',
  'sensor',
  'mechanical',
]

/** Örnek stok satırı; ileride SQLite vb. ile değiştirilecek. */
export type Part = {
  mpn: string
  category: PartCategory
  description: string
  quantity: number
  location: string
  footprint?: string
}

export const SAMPLE_PARTS: Part[] = [
  { mpn: 'NE555P', category: 'ic', description: 'Zamanlayıcı IC', quantity: 12, location: 'Kutu A-1', footprint: 'DIP-8' },
  { mpn: 'LM358N', category: 'ic', description: 'Çift işlemsel yükselteç', quantity: 8, location: 'Kutu A-1', footprint: 'DIP-8' },
  { mpn: 'LM7805CT', category: 'ic', description: '5 V sabit voltaj regülatörü', quantity: 5, location: 'Kutu A-2', footprint: 'TO-220' },
  { mpn: 'LM1117-3.3', category: 'ic', description: '3,3 V LDO (SOT-223)', quantity: 20, location: 'Kutu A-2', footprint: 'SOT-223' },
  { mpn: '2N2222A', category: 'transistor', description: 'NPN küçük sinyal transistörü', quantity: 50, location: 'Kutu B-1', footprint: 'TO-92' },
  { mpn: 'IRFZ44N', category: 'transistor', description: 'N-kanal güç MOSFET', quantity: 6, location: 'Kutu B-1', footprint: 'TO-220' },
  { mpn: '1N4148W', category: 'diode', description: 'Hızlı anahtarlama diyodu', quantity: 100, location: 'Kutu B-2', footprint: 'SOD-123' },
  { mpn: 'ATmega328P-PU', category: 'ic', description: '8-bit AVR MCU (Arduino uyumlu DIP)', quantity: 3, location: 'Kutu C-1', footprint: 'DIP-28' },
  { mpn: 'ESP32-WROOM-32', category: 'module', description: 'Wi-Fi / BLE modül', quantity: 2, location: 'Kutu C-2', footprint: 'Module' },
  { mpn: 'RC0603FR-0710KL', category: 'resistor', description: 'Direnç 10 kΩ %1', quantity: 200, location: 'Çekmece R', footprint: '0603' },
  { mpn: 'CC0603KRX7R9BB104', category: 'capacitor', description: 'Seramik kapasitör 100 nF 50 V', quantity: 150, location: 'Çekmece C', footprint: '0603' },
  { mpn: 'USB-C-16P-SMT', category: 'connector', description: 'USB-C konnektör 16 pin SMT', quantity: 15, location: 'Kutu D-1', footprint: 'SMD' },
  { mpn: 'WS2812B', category: 'led', description: 'Adreslenebilir RGB LED', quantity: 40, location: 'Kutu D-2', footprint: '5050' },
  { mpn: 'Protoboard 170', category: 'mechanical', description: 'Mini breadboard 170 delik', quantity: 10, location: 'Raf 2', footprint: '-' },
  { mpn: 'DS18B20+PAR', category: 'sensor', description: 'Dijital sıcaklık sensörü', quantity: 4, location: 'Kutu E-1', footprint: 'TO-92' },
]
