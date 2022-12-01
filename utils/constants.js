const trackingEmails = [
  { email: "shipment-tracking@amazon.com", id: "amazon" },
  { email: "ord-status@bhphotovideo.com", id: "bh" },
  { email: "outfordelivery@order.dell.com", id: "dell" },
  { email: "donotreply@fully.com", id: "Fully" },
  { email: "donotreply@buy.logitech.com", id: "logitech" },
  { email: "automation@app.smartsheet.com", id: "CTS" },
];

const trackingRegex = {
  dell: /trknbr=(\d{12}|\d{15})/,
  Fully: /tracknumbers=(.*)/,
  logitech: /InquiryNumber1=(\w{18})/,
  bh: /<a[^>]*>(\d{12}|\d{15})<\/a>/,
  CTS: /(\d{12}|\d{15})/,
};

const devices = {
  NurseDash: [
    'Lenovo Chromebook Duet 5 13.3": 8GB RAM',
    "MacBook Air M1 13”: 16GB",
    'MacBook Pro M1 14" 16GB',
    "MacBook Pro M1 13”: 16GB",
    'HP Probook 450 15", 16GB',
  ],
  FLYR: [
    'MacBook Pro M1 16.2": 32GB',
    'MacBook Pro M1 16.2": 16GB',
    'MacBook Pro M1 14": 32GB',
  ],
  SmallDoor: [
    "MacBook Air M1 13”: 16GB",
    'MacBook Pro M1 14" 16GB',
    'MacBook Pro M1 16.2": 16GB',
    'Lenovo IdeaPad 3, 14.0"',
    "HP Pavilion 15 Laptop (2020 Model)",
    'Microsoft Surface Laptop 4 - 15" - Ryzen 7 4980U: 16 GB',
  ],
  Bowery: ["Lenovo/Dell", "iPad/iPhone", "MacBook"],
};

const suppliers = {
  'MacBook Pro M1 Chip 16.2": 32GB (FLYR EU - Engineering)': {
    supplier: "Eurotel/ARP",
    company: "FLYR",
    location: "EU",
    type: "laptop",
  },
  'MacBook Pro M1 Chip 16.2": 16GB (FLYR EU - Non-Engineering)': {
    supplier: "Eurotel/ARP",
    company: "FLYR",
    location: "EU",
    type: "laptop",
  },
  "DELUX Ergonomic Wireless Keyboard": "Amazon",
  Redeployment: "CTS",
  'MacBook Pro M1 Chip 16.2": 16GB (FLYR - Stock)': {
    supplier: "ABT Electronics",
    company: "FLYR",
    location: "US",
    type: "laptop",
  },
  'MacBook Pro M1 Chip 16.2": 16GB (FLYR - Non-Engineering)': {
    supplier: "ABT Electronics",
    company: "FLYR",
    location: "US",
    type: "laptop",
  },
  'Fully Remi Standing Desk (38" x 27") (EU)': "Fully Europe",
  "Clamp-Mounted Power Strip (EU)": "Fully Europe",
  "Topo Anti-Fatigue Mat (EU)": "Fully Europe",
  "Rain Design Laptop Stand (EU)": "Amazon Europe",
  "USB-C to USB-A Adapter (EU)": "Apple Europe",
  "Office Mousepad with Gel Support": "Amazon Europe",
  "Magic Mouse for Mac (EU)": "Apple Europe",
  "Logitech M705 Marathon Mouse (EU)": "Amazon Europe",
  "Logitech MX Keys Mac (EU)": "Amazon Europe",
  "Magic Keyboard with Touch ID for Mac (EU)": "Apple Europe",
  "Magic Keyboard with Touch ID and Numeric Keypad for Mac (EU)":
    "Apple Europe",
  "Logitech C922 Pro HD Webcam (EU)": "Amazon Europe",
  "Jabra Evolve2 65 Stereo Wireless On-Ear Headset (EU)": "Amazon Europe",
  "Jarvis Monitor Arm (EU)": "Fully Europe",
  "Fully Desk Chair (EU)": "Fully Europe",
  "Cooper Standing Desk Converter (EU)": "Fully Europe",
  "USB-C to USB-A Adapter": "B&H",
  "ASUS Chromebook Flip (NurseDash) - USED": "-",
  'MacBook Air 13.3" Laptop (USED)': "-",
  'Lenovo thinkPad X1 Gen 9 14" (Bowery)': "-",
  'Fully Remi Standing Desk (38" x 27")': "Fully",
  'MacBook Pro M1 Chip 16.2": 32GB (FLYR - Engineering)': {
    supplier: "B&H",
    company: "FLYR",
    location: "US",
    type: "laptop",
  },
  'MacBook Pro M1 Chip "14: 32GB (FLYR EU)': {
    supplier: "Eurotel/ARP",
    company: "FLYR",
    location: "US",
    type: "laptop",
  },
  "FLYR Swag Pack": "Image Source",
  "HP Pavilion 15 Laptop (2020 Model)": {
    supplier: "Amazon",
    company: "SmallDoor",
    location: "US",
    type: "laptop",
  },
  "Jabra Evolve2 65 Stereo Wireless On-Ear Headset": "Amazon",
  '14" MacBook Pro - Silver - 16GB': "B&H",
  Offboarding: "CTS",
  "10.2-Inch iPad with Wi-Fi - 64GB - Space Gray": "B&H",
  "Magic Mouse for Mac": "B&H",
  "Magic Keyboard with Touch ID and Numeric Keypad for Mac": "B&H",
  "Magic Keyboard with Touch ID for Mac": "B&H",
  "Dell UltraSharp 27 Monitor": "Dell",
  'Lenovo Chromebook Duet 5 13" (NurseDash)': "Amazon/Best Buy",
  "HP Probook 450 G8 (NurseDash)": "Amazon",
  "MacBook Pro M1 Chip 13”: 16GB (NurseDash)": {
    supplier: "B&H",
    company: "NurseDash",
    location: "US",
    type: "laptop",
  },
  'Microsoft Surface Laptop 4 - 15" - Ryzen 7 4980U - 16 GB RAM - 512 GB SSD': {
    supplier: "-",
    company: "SmallDoor",
    location: "US",
    type: "laptop",
  },
  "Logitech Pebble M350 Mouse": "Amazon",
  'MacBook Pro 16" M1 Pro': "B&H",
  "Logitech MX Keys (Mac)": "B&H",
  "Logitech C922 Pro HD Webcam": "Amazon",
  "Logitech M705 Marathon Mouse": "Amazon",
  'Lenovo IdeaPad 3 Laptop, 14.0"': "Amazon",
  'HP 27" Full HD Monitor': "B&H",
  "Belkin Thunderbolt 3 Dock Core": "B&H",
  "Cooper Standing Desk Converter": "Fully",
  'MacBook Air 13.3" Laptop': "B&H",
  "MROCO Ergonomic Mouse Pad with Wrist Support Gel Mouse Pad": "Amazon",
  "Dell Docking Station – USB 3.0 (D3100)": "Dell",
  "Jarvis Monitor Arm": "Fully",
  "Intersect Hardware Accessories": "Amazon",
  "Belkin WaveRest Mousepad": "Amazon",
  "Clamp-Mounted Surge Protector": "Fully",
  "Jabra Speak 410 Speakerphone": "Amazon",
  "Jabra Evolve 75 UC Stereo Wireless Headset": "Amazon",
  "Dell WD19TB 180W Thunderbolt Docking Station": "Dell",
  "Logitech MK550 Wireless Wave Keyboard & Mouse": "Amazon",
  "Fully Jarvis Standing Desk": "Fully",
  "Rain Design Laptop Stand": "Amazon",
  "Purple Simply Seat Cushion": "Amazon",
  "ErgoFoam Adjustable Foot Rest": "Amazon",
  "Bottle Opener for Remi Desk": "Fully",
  "Standing Mat": "Fully",
  "Anti Fatigue Mat": "Fully",
  "Topo Anti-Fatigue Mat": "Fully",
  "Aleris LED Desk Lamp with USB": "Fully",
  "Vari Task Chair": "Vari",
  "Razer Kiyo Streaming Webcam": "Amazon",
  "Fully Desk Chair": "Fully",
  "Fully Remi Standing Desk": "Fully",
};

const fullyMapping = {
  "Fully Remi Standing Desk": {
    Oak: 'Fully Work Surface - Laminate - 46"x27" - Oak - with Grommet',
    default: [
      "Remi for Fully; Box 1 - V2 - Lifting Columns & Control Box - Black - Mid Range",
      "Remi for Fully; Box 2 - V2 - Frame Kit - Black - Programmable",
    ],
  },
  "Fully Desk Chair": {
    Black: "Fully Desk Chair - Black/Black",
    "White/Gray": "Alani Desk Chair - White/Grey",
  },
  "Jarvis Monitor Arm": {
    Black: "Jarvis Arm - Single - Black",
    Gray: "Jarvis Arm - Single - Silver",
  },
  "Clamp-Mounted Surge Protector": {
    Black: "Clamp-Mounted Surge Protector - Black",
  },
  "Anti Fatigue Mat": {
    Black: "Topo Mini Standing Mat - Black",
  },
};

const fullyMappingToWix = {
  "Remi for Fully; Box 1 - V2 - Lifting Columns & Control Box - Black - Mid Range":
    "Fully Remi Standing Desk",
  "Remi for Fully; Box 2 - V2 - Frame Kit - Black - Programmable":
    "Fully Remi Standing Desk",
  'Fully Work Surface - Laminate - 46"x27" - Oak - with Grommet':
    "Fully Remi Standing Desk",
  "Fully Desk Chair - Black/Black": "Fully Desk Chair",
  "Alani Desk Chair - White/Grey": "Fully Desk Chair",
  "Jarvis Arm - Single - Black": "Jarvis Monitor Arm",
  "Jarvis Arm - Single - Silver": "Jarvis Monitor Arm",
  "Clamp-Mounted Surge Protector - Black": "Clamp-Mounted Surge Protector",
  "Topo Mini Standing Mat - Black": "Anti Fatigue Mat",
  "Remi for Fully; Box 1 - Lifting Columns & Control Box - White - Mid Range":
    "Fully Remi Standing Desk",
  'Fully Work Surface - Laminate - 46"x27" - White - with Grommet':
    "Fully Remi Standing Desk",
  "Jarvis Grommet Cover - Black": "Fully Remi Standing Desk",
};

export {
  trackingEmails,
  trackingRegex,
  devices,
  suppliers,
  fullyMapping,
  fullyMappingToWix,
};
