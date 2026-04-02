import type { MainCategory } from "@/hooks/use-inventory";

export interface BusinessType {
  value: string;
  label: string;
  icon: string;
  categories: MainCategory[];
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    value: "hospitality",
    label: "Hospitality (Hotel/Resort)",
    icon: "🏨",
    categories: [
      {
        value: "rooms-linens", label: "Rooms & Linens", icon: "🛏️",
        subcategories: [
          { value: "bedding", label: "Bedding & Sheets" },
          { value: "towels", label: "Towels & Bath Linens" },
          { value: "pillows", label: "Pillows & Duvets" },
          { value: "curtains", label: "Curtains & Drapes" },
          { value: "room-furniture", label: "Room Furniture" },
        ],
      },
      {
        value: "guest-amenities", label: "Guest Amenities", icon: "🧴",
        subcategories: [
          { value: "toiletries", label: "Toiletries & Soaps" },
          { value: "minibar", label: "Minibar Items" },
          { value: "stationery", label: "Stationery & Pens" },
          { value: "slippers-robes", label: "Slippers & Robes" },
        ],
      },
      {
        value: "housekeeping", label: "Housekeeping", icon: "🧹",
        subcategories: [
          { value: "cleaning-chemicals", label: "Cleaning Chemicals" },
          { value: "cleaning-equipment", label: "Cleaning Equipment" },
          { value: "laundry-supplies", label: "Laundry Supplies" },
          { value: "trash-bags", label: "Trash Bags & Liners" },
        ],
      },
      {
        value: "kitchen-dining", label: "Kitchen & Dining", icon: "🍽️",
        subcategories: [
          { value: "cookware", label: "Cookware & Utensils" },
          { value: "tableware", label: "Tableware & Glassware" },
          { value: "food-supplies", label: "Food & Beverages" },
          { value: "kitchen-equipment", label: "Kitchen Equipment" },
        ],
      },
      {
        value: "maintenance", label: "Maintenance", icon: "🔧",
        subcategories: [
          { value: "hvac", label: "HVAC & Climate" },
          { value: "plumbing-parts", label: "Plumbing Parts" },
          { value: "electrical-parts", label: "Electrical Parts" },
          { value: "general-repair", label: "General Repair" },
          { value: "safety-equipment", label: "Safety & Fire Equipment" },
        ],
      },
      {
        value: "furniture", label: "Furniture", icon: "🪑",
        subcategories: [
          { value: "lobby-furniture", label: "Lobby & Lounge Furniture" },
          { value: "room-furniture-items", label: "Room Furniture" },
          { value: "outdoor-furniture", label: "Outdoor & Patio Furniture" },
          { value: "conference-furniture", label: "Conference & Meeting Room" },
          { value: "restaurant-furniture", label: "Restaurant & Dining Furniture" },
          { value: "office-furniture", label: "Office Furniture" },
        ],
      },
      {
        value: "front-desk", label: "Front Desk & Office", icon: "🖥️",
        subcategories: [
          { value: "office-supplies", label: "Office Supplies" },
          { value: "printing", label: "Printing & Paper" },
          { value: "key-cards", label: "Key Cards & Access" },
          { value: "signage", label: "Signage & Displays" },
        ],
      },
      {
        value: "hotel-other", label: "Other", icon: "📦",
        subcategories: [],
      },
    ],
  },
  {
    value: "restaurant",
    label: "Restaurant / Food Service",
    icon: "🍳",
    categories: [
      {
        value: "food-ingredients", label: "Food & Ingredients", icon: "🥩",
        subcategories: [
          { value: "proteins", label: "Proteins & Meats" },
          { value: "produce-fresh", label: "Produce & Fresh" },
          { value: "dairy-eggs", label: "Dairy & Eggs" },
          { value: "dry-goods", label: "Dry Goods & Grains" },
          { value: "frozen-items", label: "Frozen Items" },
          { value: "sauces-condiments", label: "Sauces & Condiments" },
          { value: "spices-seasonings", label: "Spices & Seasonings" },
        ],
      },
      {
        value: "beverages-bar", label: "Beverages & Bar", icon: "🍷",
        subcategories: [
          { value: "alcoholic", label: "Alcoholic Beverages" },
          { value: "non-alcoholic", label: "Non-Alcoholic Drinks" },
          { value: "bar-supplies", label: "Bar Supplies & Mixers" },
          { value: "coffee-tea", label: "Coffee & Tea" },
        ],
      },
      {
        value: "kitchen-equipment", label: "Kitchen Equipment", icon: "🔪",
        subcategories: [
          { value: "cooking-equipment", label: "Cooking Equipment" },
          { value: "utensils-tools", label: "Utensils & Tools" },
          { value: "storage-containers", label: "Storage Containers" },
          { value: "small-appliances", label: "Small Appliances" },
        ],
      },
      {
        value: "tableware-service", label: "Tableware & Service", icon: "🍽️",
        subcategories: [
          { value: "plates-bowls", label: "Plates & Bowls" },
          { value: "glassware", label: "Glassware" },
          { value: "flatware", label: "Flatware & Cutlery" },
          { value: "serving-pieces", label: "Serving Pieces" },
          { value: "table-linens", label: "Table Linens & Napkins" },
        ],
      },
      {
        value: "disposables", label: "Disposables & Packaging", icon: "📦",
        subcategories: [
          { value: "takeout-containers", label: "Takeout Containers" },
          { value: "paper-products", label: "Paper Products" },
          { value: "bags-wraps", label: "Bags & Wraps" },
          { value: "cups-lids", label: "Cups & Lids" },
        ],
      },
      {
        value: "restaurant-cleaning", label: "Cleaning & Sanitation", icon: "🧹",
        subcategories: [
          { value: "sanitizers", label: "Sanitizers & Disinfectants" },
          { value: "dish-cleaning", label: "Dish Cleaning" },
          { value: "floor-care", label: "Floor Care" },
          { value: "waste-management", label: "Waste Management" },
        ],
      },
      {
        value: "restaurant-other", label: "Other", icon: "📦",
        subcategories: [],
      },
    ],
  },
  {
    value: "retail",
    label: "Retail / Store",
    icon: "🏪",
    categories: [
      {
        value: "merchandise", label: "Merchandise", icon: "🏷️",
        subcategories: [
          { value: "clothing", label: "Clothing & Apparel" },
          { value: "electronics", label: "Electronics" },
          { value: "accessories", label: "Accessories" },
          { value: "home-goods", label: "Home Goods" },
          { value: "seasonal", label: "Seasonal Items" },
        ],
      },
      {
        value: "displays-fixtures", label: "Displays & Fixtures", icon: "🪧",
        subcategories: [
          { value: "shelving", label: "Shelving & Racks" },
          { value: "mannequins", label: "Mannequins & Forms" },
          { value: "display-cases", label: "Display Cases" },
          { value: "signage-pos", label: "Signage & POS Displays" },
        ],
      },
      {
        value: "packaging-shipping", label: "Packaging & Shipping", icon: "📦",
        subcategories: [
          { value: "boxes", label: "Boxes & Mailers" },
          { value: "bags-tissue", label: "Shopping Bags & Tissue" },
          { value: "tape-labels", label: "Tape & Labels" },
          { value: "packing-materials", label: "Packing Materials" },
        ],
      },
      {
        value: "pos-supplies", label: "POS & Checkout", icon: "💳",
        subcategories: [
          { value: "receipt-paper", label: "Receipt Paper & Rolls" },
          { value: "bags-checkout", label: "Bags & Wrapping" },
          { value: "cash-handling", label: "Cash Handling" },
          { value: "gift-cards", label: "Gift Cards & Vouchers" },
        ],
      },
      {
        value: "store-operations", label: "Store Operations", icon: "🔧",
        subcategories: [
          { value: "security-tags", label: "Security Tags & Systems" },
          { value: "price-guns", label: "Price Guns & Tags" },
          { value: "cleaning-retail", label: "Cleaning Supplies" },
          { value: "office-retail", label: "Office Supplies" },
        ],
      },
      {
        value: "retail-other", label: "Other", icon: "📦",
        subcategories: [],
      },
    ],
  },
  {
    value: "office",
    label: "Office / Corporate",
    icon: "🏢",
    categories: [
      {
        value: "office-supplies", label: "Office Supplies", icon: "📎",
        subcategories: [
          { value: "paper-products", label: "Paper & Notebooks" },
          { value: "writing", label: "Pens & Writing Tools" },
          { value: "filing", label: "Filing & Organization" },
          { value: "desk-accessories", label: "Desk Accessories" },
          { value: "binding", label: "Binding & Laminating" },
        ],
      },
      {
        value: "it-equipment", label: "IT & Technology", icon: "💻",
        subcategories: [
          { value: "computers", label: "Computers & Laptops" },
          { value: "monitors", label: "Monitors & Displays" },
          { value: "peripherals", label: "Keyboards, Mice & Peripherals" },
          { value: "networking", label: "Networking & Cables" },
          { value: "printers", label: "Printers & Scanners" },
          { value: "software", label: "Software & Licenses" },
        ],
      },
      {
        value: "furniture", label: "Furniture", icon: "🪑",
        subcategories: [
          { value: "desks", label: "Desks & Workstations" },
          { value: "chairs", label: "Chairs & Seating" },
          { value: "conference", label: "Conference Room" },
          { value: "storage-cabinets", label: "Storage & Cabinets" },
        ],
      },
      {
        value: "breakroom", label: "Breakroom & Kitchen", icon: "☕",
        subcategories: [
          { value: "coffee-supplies", label: "Coffee & Tea Supplies" },
          { value: "snacks-beverages", label: "Snacks & Beverages" },
          { value: "kitchen-items", label: "Kitchen Items" },
          { value: "water-cooler", label: "Water Cooler Supplies" },
        ],
      },
      {
        value: "janitorial", label: "Janitorial", icon: "🧹",
        subcategories: [
          { value: "cleaning-office", label: "Cleaning Supplies" },
          { value: "restroom", label: "Restroom Supplies" },
          { value: "trash-recycling", label: "Trash & Recycling" },
        ],
      },
      {
        value: "office-other", label: "Other", icon: "📦",
        subcategories: [],
      },
    ],
  },
  {
    value: "salon",
    label: "Salon / Beauty",
    icon: "💇",
    categories: [
      {
        value: "hair-products", label: "Hair Products", icon: "💇",
        subcategories: [
          { value: "shampoo-conditioner", label: "Shampoo & Conditioner" },
          { value: "hair-color", label: "Hair Color & Dye" },
          { value: "styling-products", label: "Styling Products" },
          { value: "treatments", label: "Treatments & Masks" },
          { value: "extensions", label: "Extensions & Wigs" },
        ],
      },
      {
        value: "nail-supplies", label: "Nail Supplies", icon: "💅",
        subcategories: [
          { value: "nail-polish", label: "Nail Polish & Gel" },
          { value: "acrylics", label: "Acrylics & Tips" },
          { value: "nail-tools", label: "Nail Tools & Files" },
          { value: "nail-care", label: "Nail Care & Cuticle" },
        ],
      },
      {
        value: "skin-care", label: "Skin Care", icon: "🧴",
        subcategories: [
          { value: "cleansers", label: "Cleansers & Toners" },
          { value: "moisturizers", label: "Moisturizers & Serums" },
          { value: "masks-peels", label: "Masks & Peels" },
          { value: "sunscreen", label: "Sunscreen & SPF" },
          { value: "waxing", label: "Waxing Supplies" },
        ],
      },
      {
        value: "makeup", label: "Makeup & Cosmetics", icon: "💄",
        subcategories: [
          { value: "foundation", label: "Foundation & Concealer" },
          { value: "eye-makeup", label: "Eye Makeup" },
          { value: "lip-products", label: "Lip Products" },
          { value: "brushes-applicators", label: "Brushes & Applicators" },
        ],
      },
      {
        value: "salon-equipment", label: "Equipment & Tools", icon: "✂️",
        subcategories: [
          { value: "scissors-clippers", label: "Scissors & Clippers" },
          { value: "dryers-irons", label: "Dryers & Flat Irons" },
          { value: "chairs-stations", label: "Chairs & Stations" },
          { value: "mirrors", label: "Mirrors & Lighting" },
          { value: "sterilizers", label: "Sterilizers & Sanitizers" },
        ],
      },
      {
        value: "salon-consumables", label: "Consumables", icon: "🧻",
        subcategories: [
          { value: "towels-capes", label: "Towels & Capes" },
          { value: "gloves", label: "Gloves & Aprons" },
          { value: "foils-papers", label: "Foils & Papers" },
          { value: "cotton-wipes", label: "Cotton & Wipes" },
        ],
      },
      {
        value: "salon-retail", label: "Retail Products", icon: "🛍️",
        subcategories: [
          { value: "retail-hair", label: "Retail Hair Products" },
          { value: "retail-skin", label: "Retail Skin Products" },
          { value: "retail-accessories", label: "Accessories & Gift Sets" },
        ],
      },
      {
        value: "salon-other", label: "Other", icon: "📦",
        subcategories: [],
      },
    ],
  },
  {
    value: "medical",
    label: "Medical Facility / Doctor's Office",
    icon: "🏥",
    categories: [
      {
        value: "medical-supplies", label: "Medical Supplies", icon: "🩺",
        subcategories: [
          { value: "gloves-ppe", label: "Gloves & PPE" },
          { value: "syringes-needles", label: "Syringes & Needles" },
          { value: "bandages-dressings", label: "Bandages & Dressings" },
          { value: "gauze-tape", label: "Gauze & Medical Tape" },
          { value: "swabs-cotton", label: "Swabs & Cotton" },
        ],
      },
      {
        value: "pharmaceuticals", label: "Pharmaceuticals", icon: "💊",
        subcategories: [
          { value: "prescription-meds", label: "Prescription Medications" },
          { value: "otc-meds", label: "OTC Medications" },
          { value: "vaccines", label: "Vaccines & Immunizations" },
          { value: "controlled-substances", label: "Controlled Substances" },
          { value: "supplements", label: "Supplements & Vitamins" },
        ],
      },
      {
        value: "diagnostic-equipment", label: "Diagnostic Equipment", icon: "🔬",
        subcategories: [
          { value: "stethoscopes", label: "Stethoscopes & BP Monitors" },
          { value: "thermometers", label: "Thermometers & Oximeters" },
          { value: "lab-equipment", label: "Lab Equipment" },
          { value: "imaging", label: "Imaging & X-Ray Supplies" },
          { value: "test-kits", label: "Test Kits & Reagents" },
        ],
      },
      {
        value: "exam-room", label: "Exam Room", icon: "🛏️",
        subcategories: [
          { value: "exam-tables", label: "Exam Tables & Covers" },
          { value: "gowns-drapes", label: "Gowns & Drapes" },
          { value: "instruments", label: "Instruments & Tools" },
          { value: "sharps-disposal", label: "Sharps & Waste Disposal" },
        ],
      },
      {
        value: "office-admin", label: "Office & Admin", icon: "🖥️",
        subcategories: [
          { value: "patient-forms", label: "Patient Forms & Records" },
          { value: "office-supplies-med", label: "Office Supplies" },
          { value: "printing-labels", label: "Printing & Labels" },
          { value: "id-badges", label: "ID Badges & Cards" },
        ],
      },
      {
        value: "sanitation", label: "Sanitation & Sterilization", icon: "🧹",
        subcategories: [
          { value: "disinfectants", label: "Disinfectants & Cleaners" },
          { value: "sterilization-equip", label: "Sterilization Equipment" },
          { value: "hand-sanitizer", label: "Hand Sanitizer & Soap" },
          { value: "biohazard", label: "Biohazard Disposal" },
        ],
      },
      {
        value: "patient-care", label: "Patient Care", icon: "❤️",
        subcategories: [
          { value: "mobility-aids", label: "Mobility Aids" },
          { value: "braces-supports", label: "Braces & Supports" },
          { value: "wound-care", label: "Wound Care" },
          { value: "respiratory", label: "Respiratory Supplies" },
        ],
      },
      {
        value: "medical-furniture", label: "Furniture & Fixtures", icon: "🪑",
        subcategories: [
          { value: "waiting-room", label: "Waiting Room Furniture" },
          { value: "medical-cabinets", label: "Medical Cabinets & Carts" },
          { value: "reception-desk", label: "Reception Desk" },
          { value: "storage-shelving", label: "Storage & Shelving" },
        ],
      },
      {
        value: "medical-other", label: "Other", icon: "📦",
        subcategories: [],
      },
    ],
  },
  {
    value: "construction",
    label: "Construction / Building",
    icon: "🏗️",
    categories: [
      {
        value: "building-materials", label: "Building Materials", icon: "🧱",
        subcategories: [
          { value: "lumber", label: "Lumber & Wood" },
          { value: "concrete-masonry", label: "Concrete & Masonry" },
          { value: "bricks-blocks", label: "Bricks & Blocks" },
          { value: "steel-metal", label: "Steel & Metal" },
          { value: "drywall", label: "Drywall & Insulation" },
          { value: "roofing", label: "Roofing Materials" },
          { value: "siding", label: "Siding & Cladding" },
        ],
      },
      {
        value: "plumbing-materials", label: "Plumbing", icon: "🔧",
        subcategories: [
          { value: "pipes-fittings", label: "Pipes & Fittings" },
          { value: "valves-connectors", label: "Valves & Connectors" },
          { value: "fixtures-sinks", label: "Fixtures & Sinks" },
          { value: "water-heaters", label: "Water Heaters & Tanks" },
        ],
      },
      {
        value: "electrical-materials", label: "Electrical", icon: "⚡",
        subcategories: [
          { value: "wiring-cables", label: "Wiring & Cables" },
          { value: "panels-breakers", label: "Panels & Breakers" },
          { value: "switches-outlets", label: "Switches & Outlets" },
          { value: "lighting-fixtures", label: "Lighting Fixtures" },
          { value: "conduit", label: "Conduit & Raceways" },
        ],
      },
      {
        value: "flooring", label: "Flooring", icon: "🪵",
        subcategories: [
          { value: "tile", label: "Tile & Stone" },
          { value: "hardwood", label: "Hardwood & Laminate" },
          { value: "carpet", label: "Carpet & Vinyl" },
          { value: "underlayment", label: "Underlayment & Adhesives" },
        ],
      },
      {
        value: "paint-finishing", label: "Paint & Finishing", icon: "🎨",
        subcategories: [
          { value: "interior-paint", label: "Interior Paint" },
          { value: "exterior-paint", label: "Exterior Paint" },
          { value: "primers-sealers", label: "Primers & Sealers" },
          { value: "stain-varnish", label: "Stain & Varnish" },
          { value: "brushes-rollers", label: "Brushes & Rollers" },
        ],
      },
      {
        value: "tools-equipment", label: "Tools & Equipment", icon: "🛠️",
        subcategories: [
          { value: "power-tools", label: "Power Tools" },
          { value: "hand-tools", label: "Hand Tools" },
          { value: "measuring-layout", label: "Measuring & Layout" },
          { value: "safety-gear", label: "Safety Gear & PPE" },
          { value: "ladders-scaffolding", label: "Ladders & Scaffolding" },
        ],
      },
      {
        value: "fasteners-hardware", label: "Fasteners & Hardware", icon: "🔩",
        subcategories: [
          { value: "screws-nails", label: "Screws & Nails" },
          { value: "bolts-nuts", label: "Bolts & Nuts" },
          { value: "anchors", label: "Anchors & Hangers" },
          { value: "hinges-locks", label: "Hinges & Locks" },
          { value: "adhesives-sealants", label: "Adhesives & Sealants" },
        ],
      },
      {
        value: "doors-windows", label: "Doors & Windows", icon: "🚪",
        subcategories: [
          { value: "interior-doors", label: "Interior Doors" },
          { value: "exterior-doors", label: "Exterior Doors" },
          { value: "windows", label: "Windows & Frames" },
          { value: "glass", label: "Glass & Glazing" },
          { value: "hardware-trim", label: "Hardware & Trim" },
        ],
      },
      {
        value: "construction-other", label: "Other", icon: "📦",
        subcategories: [],
      },
    ],
  },
];

export function getBusinessCategories(businessType: string): MainCategory[] {
  const bt = BUSINESS_TYPES.find((b) => b.value === businessType);
  return bt ? bt.categories : [];
}
