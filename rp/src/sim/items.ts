// Каталог вещей и магазинов. Эффекты: сытость, жажда, бодрость, настроение, здоровье.
// «special» — вещь с действием в мире (удочка, фонарик, ремкомплект…), его выполняет игра (game/extras.ts).
export type ItemCat = 'food' | 'drink' | 'med' | 'car' | 'fun' | 'fish' | 'gift';
export interface Item {
  name: string; icon: string; price: number; cat: ItemCat; desc: string;
  food?: number; water?: number; energy?: number; mood?: number; hp?: number;
  special?: 'rod' | 'bait' | 'flashlight' | 'umbrella' | 'repair' | 'canister' | 'lottery' | 'scratch' | 'newspaper' | 'flowers' | 'headphones' | 'camera' | 'freshener';
  keep?: boolean; // не тратится при использовании (фонарик, зонт, удочка…)
  sell?: number;  // цена скупки (рыба)
}
const I = (o: Item) => o;
export const ITEMS: Record<string, Item> = {
  // еда
  shawarma: I({ name: 'Шаурма', icon: '🌯', price: 250, cat: 'food', food: 45, mood: 4, desc: 'Сытно. +45 сытости' }),
  hotdog: I({ name: 'Хот-дог', icon: '🌭', price: 140, cat: 'food', food: 25, desc: '+25 сытости' }),
  pie: I({ name: 'Пирожок с капустой', icon: '🥟', price: 60, cat: 'food', food: 12, desc: '+12 сытости' }),
  pie_meat: I({ name: 'Пирожок с мясом', icon: '🥟', price: 80, cat: 'food', food: 16, desc: '+16 сытости' }),
  burger: I({ name: 'Бургер', icon: '🍔', price: 290, cat: 'food', food: 50, mood: 3, desc: '+50 сытости' }),
  pelmeni: I({ name: 'Пельмени', icon: '🥟', price: 320, cat: 'food', food: 60, mood: 5, desc: 'Домашние. +60 сытости' }),
  borscht: I({ name: 'Борщ в стаканчике', icon: '🍲', price: 210, cat: 'food', food: 40, water: 10, desc: '+40 сытости, +10 жажды' }),
  sandwich: I({ name: 'Бутерброд', icon: '🥪', price: 120, cat: 'food', food: 20, desc: '+20 сытости' }),
  pizza: I({ name: 'Кусок пиццы', icon: '🍕', price: 180, cat: 'food', food: 30, mood: 3, desc: '+30 сытости' }),
  cheburek: I({ name: 'Чебурек', icon: '🥟', price: 110, cat: 'food', food: 22, desc: '+22 сытости' }),
  blini: I({ name: 'Блины со сметаной', icon: '🥞', price: 190, cat: 'food', food: 32, mood: 4, desc: '+32 сытости' }),
  apple: I({ name: 'Яблоко', icon: '🍎', price: 40, cat: 'food', food: 6, water: 4, desc: '+6 сытости' }),
  banana: I({ name: 'Банан', icon: '🍌', price: 45, cat: 'food', food: 8, desc: '+8 сытости' }),
  chocolate: I({ name: 'Шоколадка', icon: '🍫', price: 90, cat: 'food', food: 8, mood: 8, desc: '+8 настроения' }),
  icecream: I({ name: 'Пломбир', icon: '🍦', price: 85, cat: 'food', food: 6, mood: 10, desc: '+10 настроения' }),
  bread: I({ name: 'Батон', icon: '🥖', price: 55, cat: 'food', food: 14, desc: '+14 сытости' }),
  croissant: I({ name: 'Круассан', icon: '🥐', price: 130, cat: 'food', food: 18, mood: 3, desc: '+18 сытости' }),
  shashlik: I({ name: 'Шашлык', icon: '🍢', price: 450, cat: 'food', food: 55, mood: 8, desc: 'С дымком. +55 сытости' }),
  oladyi: I({ name: 'Оладьи', icon: '🥞', price: 150, cat: 'food', food: 24, desc: '+24 сытости' }),
  seeds: I({ name: 'Семечки', icon: '🌻', price: 50, cat: 'food', food: 4, mood: 5, desc: 'Классика. +5 настроения' }),
  // напитки
  water: I({ name: 'Вода 0,5 л', icon: '💧', price: 50, cat: 'drink', water: 40, desc: '+40 жажды' }),
  kvas: I({ name: 'Квас', icon: '🍺', price: 90, cat: 'drink', water: 30, food: 5, mood: 3, desc: '+30 жажды' }),
  coffee: I({ name: 'Кофе', icon: '☕', price: 120, cat: 'drink', energy: 25, water: 10, desc: '+25 бодрости' }),
  tea: I({ name: 'Чай', icon: '🍵', price: 70, cat: 'drink', water: 25, energy: 8, mood: 3, desc: '+25 жажды, +8 бодрости' }),
  juice: I({ name: 'Сок', icon: '🧃', price: 110, cat: 'drink', water: 35, food: 4, desc: '+35 жажды' }),
  milk: I({ name: 'Молоко', icon: '🥛', price: 80, cat: 'drink', water: 25, food: 8, desc: '+25 жажды, +8 сытости' }),
  compote: I({ name: 'Компот', icon: '🍹', price: 70, cat: 'drink', water: 30, mood: 3, desc: 'Как у бабушки. +30 жажды' }),
  mineral: I({ name: 'Минералка', icon: '💧', price: 85, cat: 'drink', water: 45, hp: 1, desc: '+45 жажды' }),
  kefir: I({ name: 'Кефир', icon: '🥛', price: 75, cat: 'drink', water: 22, food: 6, hp: 2, desc: 'Полезно. +2 здоровья' }),
  soda: I({ name: 'Газировка', icon: '🥤', price: 95, cat: 'drink', water: 30, mood: 4, desc: '+30 жажды' }),
  energy: I({ name: 'Энергетик', icon: '⚡', price: 140, cat: 'drink', energy: 40, water: 10, hp: -2, desc: '+40 бодрости, но вредно' }),
  // аптека
  bandage: I({ name: 'Бинт и йод', icon: '🩹', price: 200, cat: 'med', hp: 20, desc: '+20 здоровья' }),
  aidkit: I({ name: 'Аптечка', icon: '⛑', price: 650, cat: 'med', hp: 60, desc: '+60 здоровья' }),
  painkiller: I({ name: 'Обезболивающее', icon: '💊', price: 240, cat: 'med', hp: 12, mood: 4, desc: '+12 здоровья' }),
  vitamins: I({ name: 'Витамины', icon: '💊', price: 300, cat: 'med', hp: 6, energy: 10, desc: '+10 бодрости, +6 здоровья' }),
  valerian: I({ name: 'Валерьянка', icon: '🌿', price: 120, cat: 'med', mood: 18, energy: -5, desc: 'Успокаивает. +18 настроения' }),
  syrup: I({ name: 'Сироп от кашля', icon: '🧴', price: 180, cat: 'med', hp: 8, desc: '+8 здоровья' }),
  // для машины
  repair: I({ name: 'Ремкомплект', icon: '🧰', price: 1500, cat: 'car', special: 'repair', desc: 'Чинит вашу машину рядом (до 0% повреждений)' }),
  canister: I({ name: 'Канистра 10 л', icon: '⛽', price: 700, cat: 'car', special: 'canister', desc: '+40% топлива машине рядом' }),
  freshener: I({ name: 'Ароматизатор «Ёлочка»', icon: '🌲', price: 90, cat: 'car', special: 'freshener', mood: 6, desc: '+6 настроения, пахнет лесом' }),
  // отдых и полезное
  rod: I({ name: 'Удочка', icon: '🎣', price: 900, cat: 'fun', special: 'rod', keep: true, desc: 'Рыбалка на набережной (нужна наживка)' }),
  bait: I({ name: 'Наживка (черви)', icon: '🪱', price: 60, cat: 'fun', special: 'bait', desc: 'Один заброс удочки' }),
  flashlight: I({ name: 'Фонарик', icon: '🔦', price: 450, cat: 'fun', special: 'flashlight', keep: true, desc: 'Светит ночью. Включить/выключить' }),
  umbrella: I({ name: 'Зонт', icon: '☂', price: 550, cat: 'fun', special: 'umbrella', keep: true, desc: 'В дождь настроение не падает' }),
  headphones: I({ name: 'Наушники', icon: '🎧', price: 1200, cat: 'fun', special: 'headphones', keep: true, desc: 'Музыка в дороге. +настроение' }),
  camera: I({ name: 'Фотоаппарат', icon: '📷', price: 2500, cat: 'fun', special: 'camera', keep: true, desc: 'Фоторежим: без интерфейса, свободная камера' }),
  lottery: I({ name: 'Лотерейный билет', icon: '🎟', price: 100, cat: 'fun', special: 'lottery', desc: 'Розыгрыш сразу: до 50 000 ₽' }),
  scratch: I({ name: 'Моментальная лотерея', icon: '🎫', price: 50, cat: 'fun', special: 'scratch', desc: 'Сотри слой — узнай выигрыш' }),
  newspaper: I({ name: 'Газета «Вести Края»', icon: '📰', price: 40, cat: 'fun', special: 'newspaper', mood: 3, desc: 'Новости города и полезный совет' }),
  raincoat: I({ name: 'Дождевик', icon: '🧥', price: 300, cat: 'fun', special: 'umbrella', keep: true, desc: 'Как зонт: в дождь настроение не падает' }),
  gum: I({ name: 'Жвачка', icon: '🫧', price: 35, cat: 'fun', mood: 2, desc: '+2 настроения' }),
  cards: I({ name: 'Колода карт', icon: '🃏', price: 150, cat: 'fun', mood: 6, desc: 'Разложить пасьянс. +6 настроения' }),
  book: I({ name: 'Книга', icon: '📖', price: 400, cat: 'fun', mood: 12, energy: -4, desc: '+12 настроения' }),
  // подарки
  flowers: I({ name: 'Букет цветов', icon: '💐', price: 700, cat: 'gift', special: 'flowers', desc: 'Подарить прохожему рядом' }),
  cake: I({ name: 'Торт «Медовик»', icon: '🎂', price: 850, cat: 'gift', food: 30, mood: 15, desc: '+15 настроения' }),
  // улов (продаётся в ларьке)
  f_perch: I({ name: 'Окунь', icon: '🐟', price: 0, sell: 180, cat: 'fish', food: 20, desc: 'Продать в ларьке или съесть' }),
  f_roach: I({ name: 'Плотва', icon: '🐟', price: 0, sell: 120, cat: 'fish', food: 15, desc: 'Продать в ларьке или съесть' }),
  f_bream: I({ name: 'Лещ', icon: '🐟', price: 0, sell: 350, cat: 'fish', food: 30, desc: 'Хороший улов' }),
  f_pike: I({ name: 'Щука', icon: '🐊', price: 0, sell: 900, cat: 'fish', food: 40, desc: 'Трофей!' }),
  f_carp: I({ name: 'Карп', icon: '🐠', price: 0, sell: 600, cat: 'fish', food: 35, desc: 'Крупный' }),
  f_boot: I({ name: 'Старый ботинок', icon: '🥾', price: 0, sell: 5, cat: 'fish', desc: 'Не повезло' }),
};
// магазины: какие вещи где продаются
export const SHOPS: Record<string, { name: string; items: string[] }> = {
  kiosk: { name: 'Ларёк «Продукты 24»', items: ['shawarma', 'hotdog', 'pie', 'pie_meat', 'cheburek', 'sandwich', 'croissant', 'compote', 'mineral', 'seeds', 'chocolate', 'icecream', 'water', 'kvas', 'coffee', 'tea', 'soda', 'energy', 'gum', 'newspaper', 'lottery', 'scratch', 'bait'] },
  market: { name: 'Супермаркет «Галерея»', items: ['burger', 'pelmeni', 'borscht', 'pizza', 'blini', 'shashlik', 'oladyi', 'raincoat', 'apple', 'banana', 'bread', 'juice', 'milk', 'kefir', 'cake', 'flowers', 'umbrella', 'headphones', 'camera', 'cards', 'book', 'flashlight', 'rod', 'bait'] },
  pharmacy: { name: 'Аптека', items: ['bandage', 'aidkit', 'painkiller', 'vitamins', 'valerian', 'syrup', 'water'] },
  gas: { name: 'Магазин АЗС', items: ['canister', 'repair', 'freshener', 'coffee', 'hotdog', 'water', 'energy', 'flashlight', 'newspaper'] },
};
export const FISH: [string, number][] = [['f_roach', 34], ['f_perch', 28], ['f_bream', 15], ['f_carp', 9], ['f_pike', 5], ['f_boot', 9]];
export function rollFish(r: number) { let s = FISH.reduce((a, f) => a + f[1], 0) * r; for (const [id, w] of FISH) { s -= w; if (s <= 0) return id; } return FISH[0][0]; }
export function lotteryPrize(r: number) { return r < .005 ? 50000 : r < .03 ? 5000 : r < .1 ? 1000 : r < .25 ? 200 : r < .4 ? 100 : 0; }
export function scratchPrize(r: number) { return r < .01 ? 10000 : r < .06 ? 500 : r < .2 ? 100 : r < .35 ? 50 : 0; }
