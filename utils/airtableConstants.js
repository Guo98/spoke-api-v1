const baseIds = {
  flyr: "appFWDQO3sOOBimEM",
  nursedash: "app8dpLfqZABe5gn9",
  bowery: "appGF9jIDpXMYHQmk",
  test: "appeCVfCNVVQOYcFI",
};

const orderTables = {
  test: "Table 1",
  flyr: "FLYR Labs - Orders Overview",
  nursedash: "NurseDash - Orders Overview",
  bowery: "Bowery - Orders Overview",
};

const inventoryTables = {
  test: "Inventory",
  flyr: "FLYR Labs - Inventory",
  nursedash: "NurseDash - Inventory",
  bowery: "Bowery - Inventory",
};

const deployedTables = {
  test: "Deployed",
  flyr: "FLYR Labs - Deployed",
  nursedash: "NurseDash - Deployed",
  bowery: "Bowery - Deployed",
};

const flyrLaptops = [
  'MacBook Pro M1 Chip 14.2": 32GB',
  "Fully Desk Chair",
  "FLYR Swag Pack",
  'MacBook Pro M1 Chip 16.2": 32GB (FLYR)',
  "Flyr Swag Pack",
  "Magic Keyboard with Touch ID and Numeric Keypad for Mac",
  "Magic Mouse for Mac",
  "Rain Design Laptop Stand",
  "Clamp-Mounted Surge Protector",
  "Jabra Evolve2 65 Stereo Wireless On-Ear Headset",
  'HP 27" Full HD Monitor',
  "USB-C to USB Adapter",
  "Logitech MX Keys (Mac)",
  "USB-C to USB Adapter (EU)",
  "Magic Mouse for Mac (EU)",
  "Jarvis Monitor Arm (EU)",
  "Magic Keyboard with Touch ID and Numeric Keypad for Mac (EU)",
  '20 x MacBook Pro M1 Chip "16: 32GB (Flyr Labs)',
  'MacBook Pro M1 Chip 14.2": 16GB',
  'MacBook Pro M1 Chip "14: 32GB (Flyr Labs)',
  'MacBook Pro M1 Chip 14.2": 32GB (FLYR EU)',
  'MacBook Pro M1 Chip "14: 32GB (FLYR EU)',
  'MacBook Pro M1 Chip 16.2": 16GB (FLYR)',
  'MacBook Pro M1 Chip "14: 32GB (FLYR UK)',
  'MacBook Pro M1 Chip "14: 32GB (FLYR Other)',
  " $ -   ",
];

const boweryLaptops = [
  'MacBook Pro M1 Chip 14.2": 32GB',
  "Fully Desk Chair",
  "FLYR Swag Pack",
  'MacBook Pro M1 Chip 16.2": 32GB (FLYR)',
  "Flyr Swag Pack",
  "Magic Keyboard with Touch ID and Numeric Keypad for Mac",
  "Magic Mouse for Mac",
  "Rain Design Laptop Stand",
  "Clamp-Mounted Surge Protector",
  "Jabra Evolve2 65 Stereo Wireless On-Ear Headset",
  'HP 27" Full HD Monitor',
  "USB-C to USB Adapter",
  "Logitech MX Keys (Mac)",
  "USB-C to USB Adapter (EU)",
  "Magic Mouse for Mac (EU)",
  "Jarvis Monitor Arm (EU)",
  "Magic Keyboard with Touch ID and Numeric Keypad for Mac (EU)",
  '20 x MacBook Pro M1 Chip "16: 32GB (Flyr Labs)',
  'MacBook Pro M1 Chip 14.2": 16GB',
  'MacBook Pro M1 Chip "14: 32GB (Flyr Labs)',
  'MacBook Pro M1 Chip 14.2": 32GB (FLYR EU)',
  'MacBook Pro M1 Chip "14: 32GB (FLYR EU)',
  'MacBook Pro M1 Chip 16.2": 16GB (FLYR)',
  'MacBook Pro M1 Chip "14: 32GB (FLYR UK)',
  'Lenovo thinkPad X1 Gen 9 14" (Bowery)',
  "Offboarding",
];

const nursedashLaptops = [
  'MacBook Air M1 Chip "13: 16GB (NurseDash)',
  'Lenovo Chromebook Duet 5 13" (NurseDash)',
  'MacBook Pro M1 Pro 14"',
  "MacBook Pro M1 Chip 13”: 16GB (NurseDash)",
  "HP Probook 450 G8",
  "Offboarding",
];

const laptopStatus = [
  "Order Received",
  "Shipped",
  "Completed",
  "Offboarding",
  "Returned",
  "In Process",
];

const locations = ["EU", "US", "Other"];

export {
  flyrLaptops,
  laptopStatus,
  locations,
  baseIds,
  orderTables,
  inventoryTables,
  deployedTables,
  boweryLaptops,
  nursedashLaptops,
};
