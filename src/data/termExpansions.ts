/**
 * Doğal dil → depo araması genişletmesi (yerel asistan; internet yok).
 * İsterseniz yeni satırlar ekleyerek muadil anahtar kelimeleri büyütebilirsiniz.
 */
export const TERM_EXPANSIONS: Record<string, string[]> = {
  arduino: ['atmega', 'avr', 'mcu', '328', 'uno'],
  atmega: ['avr', 'arduino', 'mcu'],
  avr: ['atmega', 'arduino'],
  ne555: ['555', 'zamanlayıcı', 'timer'],
  '555': ['ne555', 'zamanlayıcı'],
  opamp: ['işlemsel', 'lm358', 'yükselteç', 'yükseltici'],
  işlemsel: ['opamp', 'lm358'],
  regülatör: ['7805', 'ldo', '1117', 'voltaj'],
  regulator: ['7805', 'ldo', 'voltaj'],
  ldo: ['1117', 'regülatör'],
  mosfet: ['irfz', 'n-kanal', 'kanal'],
  diyot: ['1n4148', 'schottky'],
  direnç: ['rc0603', 'kω', 'kohm', 'ohm'],
  kondansatör: ['kapasitör', 'seramik', '104', 'nf'],
  kapasitör: ['kondansatör', 'seramik'],
  usb: ['usb-c', 'konnektör'],
  wifi: ['esp32', 'ble', 'modül'],
  esp: ['esp32', 'wroom'],
  sıcaklık: ['ds18b20', 'sensör'],
  led: ['ws2812', 'rgb', 'adreslenebilir'],
  breadboard: ['protoboard'],
  proto: ['protoboard', 'breadboard'],
}
