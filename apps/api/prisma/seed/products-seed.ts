import { PrismaClient, Species, OrderStatus, PaymentMode } from '@prisma/client';

export async function seedProductsAndOrders(prisma: PrismaClient, demoUserId: string) {
  console.log('Seeding Phase 7 categories, products, variants, sample reviews, and orders...');

  // 1. Categories
  const categoriesData = [
    {
      slug: 'food',
      name: 'Organic & Fresh Food',
      sortOrder: 1,
      imageKey: '/images/svc-shop-01.jpg',
    },
    {
      slug: 'treats',
      name: 'Natural Rewards & Chews',
      sortOrder: 2,
      imageKey: '/images/story-01.jpg',
    },
    {
      slug: 'beds',
      name: 'Orthopedic Beds & Blankets',
      sortOrder: 3,
      imageKey: '/images/hero-02.jpg',
    },
    {
      slug: 'collars-leashes',
      name: 'Leather Collars & Leashes',
      sortOrder: 4,
      imageKey: '/images/how-02.jpg',
    },
    {
      slug: 'bowls-feeders',
      name: 'Ceramic Bowls & Slow Feeders',
      sortOrder: 5,
      imageKey: '/images/how-01.jpg',
    },
    {
      slug: 'grooming-tools',
      name: 'Boutique Grooming Essentials',
      sortOrder: 6,
      imageKey: '/images/svc-groom-01.jpg',
    },
    {
      slug: 'toys',
      name: 'Sensory & Enrichment Toys',
      sortOrder: 7,
      imageKey: '/images/pet-01.jpg',
    },
    {
      slug: 'wellness-supplements',
      name: 'Botanical Care & Supplements',
      sortOrder: 8,
      imageKey: '/images/how-03.jpg',
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder, imageKey: cat.imageKey },
      create: { slug: cat.slug, name: cat.name, sortOrder: cat.sortOrder, imageKey: cat.imageKey },
    });
    categoryMap.set(cat.slug, record.id);
  }

  // 2. Products and Variants
  const products = [
    // --- FOOD ---
    {
      slug: 'nordic-pasture-raised-salmon-kibble',
      name: 'Nordic Pasture-Raised Salmon & Sweet Potato Kibble',
      brand: 'Nordic Hound',
      categorySlug: 'food',
      description: 'Slow-baked, nutrient-dense recipe made with wild-caught Alaskan salmon, prebiotic sweet potato, and cold-pressed flaxseed oil for optimal gut health and coat sheen.',
      details: {
        specs: { Origin: 'Norway & Alaska', Processing: 'Gentle low-heat baked', Grain: 'Grain-Free' },
        ingredients: 'Wild Alaskan Salmon, Dehydrated Sweet Potato, Organic Green Lentils, Cold-Pressed Flaxseed Oil, Kelp Flour, Vitamin E.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG],
      lifeStage: ['Adult', 'Senior'],
      tags: ['Grain-Free', 'Wild-Caught', 'High-Omega', 'Bestseller'],
      imageKeys: ['/images/products/nordic-pasture-raised-salmon-kibble.jpg'],
      ratingAvg: 4.9,
      ratingCount: 38,
      variants: [
        { sku: 'NH-SAL-5LB', name: '5 lb Bag', priceCents: 3400, compareAtCents: 3800, stock: 45, reserved: 0 },
        { sku: 'NH-SAL-15LB', name: '15 lb Bag', priceCents: 7800, compareAtCents: 8500, stock: 22, reserved: 0 },
        { sku: 'NH-SAL-25LB', name: '25 lb Bag', priceCents: 11900, compareAtCents: 13000, stock: 12, reserved: 0 },
      ],
      reviews: [
        {
          rating: 5,
          title: 'Transformed my Golden’s coat!',
          body: 'Barnaby had dry, itchy skin during winter. After three weeks on this salmon kibble, his itching stopped completely and his coat feels radiant.',
        },
        {
          rating: 5,
          title: 'Clean ingredients you can see',
          body: 'Smells genuinely like fresh baked fish without any burnt filler smells. My picky eater clears her bowl every single morning.',
        },
      ],
    },
    {
      slug: 'alpine-meadow-free-range-duck-dinner',
      name: 'Alpine Meadow Free-Range Duck & Cranberry Recipe',
      brand: 'Alpine Tails',
      categorySlug: 'food',
      description: 'Single-source novel poultry formulated for dogs with food sensitivities. Enriched with mountain cranberries and chicory inulin to support bladder wellness.',
      details: {
        specs: { Protein: '32% Min', Fat: '16% Min', Fiber: '4.5% Max' },
        ingredients: 'Free-Range Duck, Deboned Duck Meal, Organic Peas, Dried Cranberries, Sunflower Oil, Chicory Root.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG],
      lifeStage: ['Puppy', 'Adult'],
      tags: ['Single-Protein', 'Hypoallergenic', 'Free-Range'],
      imageKeys: ['/images/products/alpine-meadow-free-range-duck-dinner.jpg'],
      ratingAvg: 4.8,
      ratingCount: 24,
      variants: [
        { sku: 'AT-DUCK-4LB', name: '4 lb Bag', priceCents: 3200, compareAtCents: 3600, stock: 30, reserved: 0 },
        { sku: 'AT-DUCK-12LB', name: '12 lb Bag', priceCents: 7400, compareAtCents: 8200, stock: 18, reserved: 0 },
      ],
    },
    {
      slug: 'serene-feline-ocean-whitefish-pate',
      name: 'Serene Feline Wild Ocean Whitefish & Bone Broth Pate',
      brand: 'Botanical Bark & Whisker',
      categorySlug: 'food',
      description: 'Silky, hydration-rich feline recipe gently simmered in slow-cooked fish bone broth. 100% carrageenan-free and balanced with taurine for clear eyes.',
      details: {
        specs: { Moisture: '82%', CanSize: '5.5 oz', CaseQuantity: '12 Cans' },
        ingredients: 'Wild Ocean Whitefish, Fish Bone Broth, Pumpkin Puree, Salmon Oil, Taurine, Cranberry Extract.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.CAT],
      lifeStage: ['Kitten', 'Adult', 'Senior'],
      tags: ['Grain-Free', 'Hydration-First', 'Carrageenan-Free'],
      imageKeys: ['/images/products/serene-feline-ocean-whitefish-pate.jpg'],
      ratingAvg: 4.95,
      ratingCount: 42,
      variants: [
        { sku: 'SF-WF-6PK', name: 'Pack of 6 (5.5 oz)', priceCents: 2400, compareAtCents: 2800, stock: 40, reserved: 0 },
        { sku: 'SF-WF-12PK', name: 'Case of 12 (5.5 oz)', priceCents: 4500, compareAtCents: 5200, stock: 25, reserved: 0 },
        { sku: 'SF-WF-24PK', name: 'Case of 24 (5.5 oz)', priceCents: 8600, compareAtCents: 9800, stock: 14, reserved: 0 },
      ],
    },
    {
      slug: 'heritage-grass-fed-lamb-freeze-dried',
      name: 'Heritage Grass-Fed Lamb Freeze-Dried Raw Morsels',
      brand: 'Harvest Hound',
      categorySlug: 'food',
      description: 'Minimally processed raw lamb, organ meat, and crushed organic marrow bone, freeze-dried raw to protect vital enzymes, vitamins, and minerals.',
      details: {
        specs: { RawRatio: '95% Meat & Organs', Moisture: '5% Max' },
        ingredients: 'Grass-Fed Lamb, Lamb Heart, Lamb Liver, Ground Lamb Bone, Organic Blueberries, Kelp.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG, Species.CAT],
      lifeStage: ['All Stages'],
      tags: ['Raw Diet', 'Freeze-Dried', 'Single-Ingredient Base'],
      imageKeys: ['/images/products/heritage-grass-fed-lamb-freeze-dried.jpg'],
      ratingAvg: 4.88,
      ratingCount: 19,
      variants: [
        { sku: 'HH-LAMB-14OZ', name: '14 oz Pouch', priceCents: 4200, stock: 20, reserved: 0 },
        { sku: 'HH-LAMB-28OZ', name: '28 oz Value Bag', priceCents: 7900, stock: 8, reserved: 0 },
      ],
    },

    // --- TREATS ---
    {
      slug: 'organic-peanut-butter-pumpkin-biscuits',
      name: 'Woodland Baked Peanut Butter & Pumpkin Snaps',
      brand: 'Harvest Hound',
      categorySlug: 'treats',
      description: 'Crispy oven-baked biscuits made with stone-ground oats, organic roasted Valencia peanuts, and golden pumpkin mash. Free from salt, sugar, and xylitol.',
      details: {
        specs: { Calories: '14 kcal/treat', Texture: 'Crunchy snap' },
        ingredients: 'Organic Rolled Oats, Roasted Peanut Butter (100% Peanuts), Pumpkin Puree, Cinnamon, Rosemary Extract.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG],
      lifeStage: ['Adult', 'Puppy', 'Senior'],
      tags: ['Vegetarian', 'Oven-Baked', 'Digestive Aid'],
      imageKeys: ['/images/products/organic-peanut-butter-pumpkin-biscuits.jpg'],
      ratingAvg: 4.85,
      ratingCount: 52,
      variants: [
        { sku: 'HH-PB-8OZ', name: '8 oz Box', priceCents: 1400, compareAtCents: 1600, stock: 65, reserved: 0 },
        { sku: 'HH-PB-16OZ', name: '16 oz Twin Pack', priceCents: 2400, compareAtCents: 2800, stock: 34, reserved: 0 },
      ],
      reviews: [
        {
          rating: 5,
          title: 'My dogs literally dance for these',
          body: 'The smell is like freshly baked peanut butter cookies. Crunchy but easy enough for my 12-year-old rescue to chew without trouble.',
        },
      ],
    },
    {
      slug: 'wild-icelandic-cod-skin-chews',
      name: 'Wild Icelandic Cod Skin Spiral Chews',
      brand: 'Nordic Hound',
      categorySlug: 'treats',
      description: 'Single-ingredient rolled cod skins hand-twisted and air-dried under geothermal energy. Naturally cleans plaque and massages gums without rawhide.',
      details: {
        specs: { Length: 'approx 7 inches', Texture: 'Tough dental roll' },
        ingredients: '100% Air-Dried Icelandic Cod Skin.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG],
      lifeStage: ['Puppy', 'Adult'],
      tags: ['Rawhide-Alternative', 'Dental Care', 'Single-Ingredient'],
      imageKeys: ['/images/products/wild-icelandic-cod-skin-chews.jpg'],
      ratingAvg: 4.92,
      ratingCount: 31,
      variants: [
        { sku: 'NH-COD-5PK', name: '5 Chews Pack', priceCents: 1800, stock: 50, reserved: 0 },
        { sku: 'NH-COD-10PK', name: '10 Chews Pack', priceCents: 3200, compareAtCents: 3600, stock: 2, reserved: 0 }, // Low stock: 2 left!
      ],
    },
    {
      slug: 'freeze-dried-wild-salmon-bites',
      name: 'Tender Freeze-Dried Wild Salmon Training Morsels',
      brand: 'Komorebi Pets',
      categorySlug: 'treats',
      description: 'Bite-sized cubes of raw wild Pacific salmon gently freeze-dried to lock in intense umami aroma. High-value reward ideal for puppy training and agility.',
      details: {
        specs: { Calories: '2 kcal per bite', BagWeight: '4 oz' },
        ingredients: '100% Wild Pacific Sockeye Salmon.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG, Species.CAT],
      lifeStage: ['Puppy', 'Kitten', 'Adult', 'Senior'],
      tags: ['High-Value Training', 'Zero-Additives', 'Hypoallergenic'],
      imageKeys: ['/images/products/freeze-dried-wild-salmon-bites.jpg'],
      ratingAvg: 4.97,
      ratingCount: 64,
      variants: [
        { sku: 'KP-SAL-TRAIN', name: '4 oz Resealable Bag', priceCents: 1600, stock: 55, reserved: 0 },
      ],
    },

    // --- BEDS ---
    {
      slug: 'cloud-haven-orthopedic-memory-foam-lounge-bed',
      name: 'Cloud Haven Ergonomic Memory Foam Lounge Bed',
      brand: 'LuxePup Studio',
      categorySlug: 'beds',
      description: 'CertiPUR-US multi-density memory foam base with wraparound bolster cushions. Wrapped in water-repellent, machine-washable boucle fabric for architectural comfort.',
      details: {
        specs: { Foam: '3-inch High Resilience Orthopedic Core', Cover: 'OEKO-TEX Boucle Fabric, Removable Zip' },
        materials: 'CertiPUR-US Foam, Vegan Suede Lining, Cotton Boucle Exterior.',
        careInstructions: 'Machine wash cover in cold water on gentle cycle; air dry flat.',
        deliveryEstimate: 'Delivered in 3-5 business days (oversized courier)',
      },
      species: [Species.DOG],
      lifeStage: ['Adult', 'Senior'],
      tags: ['Orthopedic', 'Washable Cover', 'Architectural Design'],
      imageKeys: ['/images/products/cloud-haven-orthopedic-memory-foam-lounge-bed.jpg'],
      ratingAvg: 4.96,
      ratingCount: 47,
      variants: [
        { sku: 'LP-BED-S', name: 'Small (24" x 18")', priceCents: 9500, compareAtCents: 11000, stock: 15, reserved: 0 },
        { sku: 'LP-BED-M', name: 'Medium (34" x 24")', priceCents: 13500, compareAtCents: 15500, stock: 8, reserved: 0 },
        { sku: 'LP-BED-L', name: 'Large (42" x 30")', priceCents: 17500, compareAtCents: 19500, stock: 5, reserved: 0 },
        { sku: 'LP-BED-XL', name: 'Extra Large (50" x 36")', priceCents: 21500, stock: 0, reserved: 0 }, // OUT OF STOCK!
      ],
      reviews: [
        {
          rating: 5,
          title: 'Barnaby hasn’t left this bed all afternoon',
          body: 'The foam is thick and dense—it doesn’t sink to the floor like cheap beds. The boucle fabric matches our living room furniture beautifully.',
        },
      ],
    },
    {
      slug: 'serene-wool-calming-donut-pet-cave',
      name: 'Organic Felted Wool Calming Pet Donut & Burrow Nest',
      brand: 'Komorebi Pets',
      categorySlug: 'beds',
      description: 'Handcrafted from 100% New Zealand merino wool. Provides a safe, enclosed sanctuary for cats and small dogs seeking acoustic peace and thermal warmth.',
      details: {
        specs: { Diameter: '18 inches', Weight: '2.2 lbs' },
        materials: '100% Pure Organic Merino Wool, Azo-Free Dyes.',
        careInstructions: 'Spot clean with wool detergent; vacuum gently with brush attachment.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG, Species.CAT],
      lifeStage: ['All Stages'],
      tags: ['Eco-Friendly', 'Thermal Wool', 'Anxiety Relief'],
      imageKeys: ['/images/products/serene-wool-calming-donut-pet-cave.jpg'],
      ratingAvg: 4.84,
      ratingCount: 28,
      variants: [
        { sku: 'KP-CAVE-OAT', name: 'Oatmeal Tweed', priceCents: 6800, compareAtCents: 7500, stock: 18, reserved: 0 },
        { sku: 'KP-CAVE-SLATE', name: 'Charcoal Slate', priceCents: 6800, compareAtCents: 7500, stock: 12, reserved: 0 },
      ],
    },

    // --- COLLARS & LEASHES ---
    {
      slug: 'atelier-vegetable-tanned-leather-collar',
      name: 'Atelier Vegetable-Tanned Full Grain Leather Collar',
      brand: 'Artisan Paws',
      categorySlug: 'collars-leashes',
      description: 'Hand-stitched in upstate New York using Tuscan full-grain bridle leather and solid antiqued brass hardware. Develops a warm caramel patina with daily walks.',
      details: {
        specs: { Width: '1 inch (M/L) / 0.75 inch (S)', Hardware: 'Solid Brass Buckle & D-Ring' },
        materials: 'Tuscan Full-Grain Vegetable-Tanned Leather.',
        careInstructions: 'Treat with natural leather conditioner once every six months.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG],
      lifeStage: ['Adult', 'Puppy'],
      tags: ['Handcrafted', 'Solid Brass', 'Full-Grain Leather'],
      imageKeys: ['/images/products/atelier-vegetable-tanned-leather-collar.jpg'],
      ratingAvg: 4.93,
      ratingCount: 35,
      variants: [
        { sku: 'AP-COL-S-TAN', name: 'Small / Saddle Tan', priceCents: 4800, stock: 24, reserved: 0 },
        { sku: 'AP-COL-M-TAN', name: 'Medium / Saddle Tan', priceCents: 5200, stock: 20, reserved: 0 },
        { sku: 'AP-COL-L-TAN', name: 'Large / Saddle Tan', priceCents: 5600, stock: 14, reserved: 0 },
        { sku: 'AP-COL-M-BLK', name: 'Medium / Matte Black', priceCents: 5200, stock: 18, reserved: 0 },
      ],
    },
    {
      slug: 'atelier-hands-free-climbing-rope-leash',
      name: 'Nordic Multi-Way Hands-Free Climbing Rope Leash',
      brand: 'Nordic Hound',
      categorySlug: 'collars-leashes',
      description: 'Engineered from supple 10mm mountaineering dynamic rope with 360-degree brass locking snap hooks. Configurable as cross-body, waist leash, or double-dog splitter.',
      details: {
        specs: { Length: '7.5 ft total', BreakingStrength: 'Over 1,200 lbs', Weight: '280g' },
        materials: 'Braided Polyamide Climbing Kernmantle Rope, Solid Brass O-Rings.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG],
      lifeStage: ['All Stages'],
      tags: ['Hands-Free', 'Climbing Rope', 'Weatherproof'],
      imageKeys: ['/images/products/atelier-hands-free-climbing-rope-leash.jpg'],
      ratingAvg: 4.91,
      ratingCount: 44,
      variants: [
        { sku: 'NH-LSH-SAGE', name: 'Sage Green (7.5 ft)', priceCents: 5800, compareAtCents: 6500, stock: 22, reserved: 0 },
        { sku: 'NH-LSH-EARTH', name: 'Terracotta Earth (7.5 ft)', priceCents: 5800, compareAtCents: 6500, stock: 16, reserved: 0 },
      ],
    },

    // --- BOWLS & FEEDERS ---
    {
      slug: 'stoneware-slow-feeder-enrichment-bowl',
      name: 'Nordic Hand-Thrown Ceramic Slow Feeder & Lick Bowl',
      brand: 'Komorebi Pets',
      categorySlug: 'bowls-feeders',
      description: 'Heavyweight glazed ceramic bowl sculpted with smooth organic waves that prevent rapid gulping, gas, and bloat without distressing whiskers or snout.',
      details: {
        specs: { Capacity: '3.5 Cups', Weight: '2.4 lbs (Non-skid weight)' },
        materials: 'Lead-Free Stoneware Ceramic, Food-Grade Glaze.',
        careInstructions: 'Dishwasher and microwave safe.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG, Species.CAT],
      lifeStage: ['All Stages'],
      tags: ['Slow Feeder', 'Lead-Free Ceramic', 'Whisker-Friendly'],
      imageKeys: ['/images/products/stoneware-slow-feeder-enrichment-bowl.jpg'],
      ratingAvg: 4.89,
      ratingCount: 39,
      variants: [
        { sku: 'KP-BOWL-CREAM', name: 'Matte Sandstone Cream', priceCents: 3800, compareAtCents: 4400, stock: 32, reserved: 0 },
        { sku: 'KP-BOWL-SAGE', name: 'Moss Glaze Sage', priceCents: 3800, compareAtCents: 4400, stock: 26, reserved: 0 },
      ],
    },
    {
      slug: 'elevated-walnut-wood-double-feeder',
      name: 'Architectural Elevated Solid Walnut Double Feeder',
      brand: 'Artisan Paws',
      categorySlug: 'bowls-feeders',
      description: 'Sustainably harvested American black walnut finished with organic beeswax. Elevates stainless steel or ceramic bowls to reduce neck fatigue in medium and large pets.',
      details: {
        specs: { Height: '7.5 inches', Length: '18 inches', Bowls: 'Two 32 oz Stainless Inserts Included' },
        materials: 'Solid American Walnut, 304 Food-Grade Stainless Steel.',
        careInstructions: 'Wipe walnut stand with damp cloth; bowls are dishwasher safe.',
        deliveryEstimate: 'Delivered in 3-5 business days',
      },
      species: [Species.DOG],
      lifeStage: ['Adult', 'Senior'],
      tags: ['Elevated Dining', 'Solid Walnut', 'Joint Support'],
      imageKeys: ['/images/products/elevated-walnut-wood-double-feeder.jpg'],
      ratingAvg: 4.94,
      ratingCount: 27,
      variants: [
        { sku: 'AP-FEED-M', name: 'Medium Height (7.5")', priceCents: 11000, stock: 15, reserved: 0 },
        { sku: 'AP-FEED-L', name: 'Tall Height (11")', priceCents: 12500, stock: 9, reserved: 0 },
      ],
    },

    // --- GROOMING TOOLS ---
    {
      slug: 'beechwood-artisan-pin-and-bristle-brush',
      name: 'Handcrafted Beechwood Dual Pin & Wild Boar Bristle Brush',
      brand: 'Botanical Bark & Whisker',
      categorySlug: 'grooming-tools',
      description: 'Turned German beechwood handle fitted with rounded brass pins on one side to detangle undercoat, and dense natural boar bristle on the other to distribute natural oils.',
      details: {
        specs: { Length: '9.2 inches', PinLength: '22mm rounded comfort tips' },
        materials: 'FSC-Certified Beechwood, Wild Boar Bristle, Anti-Static Rubber Cushion.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG, Species.CAT],
      lifeStage: ['All Stages'],
      tags: ['Eco-Grooming', 'Boar Bristle', 'Anti-Static'],
      imageKeys: ['/images/products/beechwood-artisan-pin-and-bristle-brush.jpg'],
      ratingAvg: 4.91,
      ratingCount: 33,
      variants: [
        { sku: 'BB-BRUSH-STD', name: 'Full Size (9.2")', priceCents: 2800, compareAtCents: 3400, stock: 45, reserved: 0 },
      ],
    },
    {
      slug: 'botanical-chamomile-calming-shampoo',
      name: 'Organic Chamomile & Colloidal Oatmeal Hypoallergenic Shampoo',
      brand: 'Botanical Bark & Whisker',
      categorySlug: 'grooming-tools',
      description: 'Sulfate-free conditioning formula infused with organic chamomile, aloe vera juice, and fine colloidal oat silk. Soothes dry, flaky skin without stripping protective lipids.',
      details: {
        specs: { Volume: '16 fl oz / 473 ml', pH: '6.8 (Physiological Canine Balance)' },
        ingredients: 'Aloe Leaf Juice, Colloidal Oatmeal, Chamomile Flower Extract, Coconut Glucoside, Vegetable Glycerin.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG, Species.CAT],
      lifeStage: ['Puppy', 'Adult', 'Senior'],
      tags: ['Sulfate-Free', 'Colloidal Oatmeal', 'Hypoallergenic'],
      imageKeys: ['/images/products/botanical-chamomile-calming-shampoo.jpg'],
      ratingAvg: 4.96,
      ratingCount: 58,
      variants: [
        { sku: 'BB-SHAMP-16OZ', name: '16 oz Bottle', priceCents: 2200, compareAtCents: 2600, stock: 50, reserved: 0 },
        { sku: 'BB-SHAMP-32OZ', name: '32 oz Refill Jug', priceCents: 3800, compareAtCents: 4400, stock: 24, reserved: 0 },
      ],
    },

    // --- TOYS ---
    {
      slug: 'organic-hemp-rope-tug-and-floss-ring',
      name: 'Triple-Strand Natural Organic Hemp Rope Chew Ring',
      brand: 'Harvest Hound',
      categorySlug: 'toys',
      description: '100% pesticide-free European hemp fibers. Dense three-ply braid naturally cleans interdental spaces while enduring vigorous games of tug.',
      details: {
        specs: { Diameter: '8 inches', Thickness: '1.2 inches' },
        materials: '100% Raw European Hemp Rope, Dye-Free.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG],
      lifeStage: ['Puppy', 'Adult'],
      tags: ['Biodegradable', 'Zero-Plastic', 'Dental Chew'],
      imageKeys: ['/images/products/organic-hemp-rope-tug-and-floss-ring.jpg'],
      ratingAvg: 4.82,
      ratingCount: 41,
      variants: [
        { sku: 'HH-HEMP-MED', name: 'Medium Ring (8")', priceCents: 1600, stock: 60, reserved: 0 },
        { sku: 'HH-HEMP-LRG', name: 'Large Double Knot (12")', priceCents: 2200, stock: 35, reserved: 0 },
      ],
    },
    {
      slug: 'sensory-felt-wool-catnip-mice-trio',
      name: 'Fair-Trade Organic Wool & Wild Nepeta Catnip Trio',
      brand: 'Komorebi Pets',
      categorySlug: 'toys',
      description: 'Hand-felted merino wool mice stuffed with fragrant, potent organically harvested Washington catnip. Completely plastic and staple-free.',
      details: {
        specs: { Quantity: 'Set of 3 Mice', Length: '3.5 inches each + tail' },
        materials: 'New Zealand Wool, Organic Washington Catnip Leaf.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.CAT],
      lifeStage: ['Kitten', 'Adult', 'Senior'],
      tags: ['Organic Catnip', 'Fair-Trade', 'Zero-Plastic'],
      imageKeys: ['/images/products/sensory-felt-wool-catnip-mice-trio.jpg'],
      ratingAvg: 4.93,
      ratingCount: 36,
      variants: [
        { sku: 'KP-MICE-3PK', name: 'Trio Set (3 Colors)', priceCents: 1500, compareAtCents: 1800, stock: 40, reserved: 0 },
      ],
    },

    // --- WELLNESS & SUPPLEMENTS ---
    {
      slug: 'wild-alaskan-salmon-and-krill-oil-drops',
      name: 'Wild Alaskan Salmon & Antarctic Krill Omega-3 Elixir',
      brand: 'Nordic Hound',
      categorySlug: 'wellness-supplements',
      description: 'Pure cold-extracted wild marine oil containing concentrated EPA, DHA, and natural astaxanthin antioxidant. Supports mobility, cognitive clarity, and glossy skin.',
      details: {
        specs: { EPA: '425mg/pump', DHA: '380mg/pump', Volume: '16 fl oz with no-drip dispenser' },
        ingredients: 'Wild Alaskan Salmon Oil, Antarctic Krill Oil, Non-GMO Mixed Tocopherols.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG, Species.CAT],
      lifeStage: ['Puppy', 'Kitten', 'Adult', 'Senior'],
      tags: ['Joint Support', 'Skin & Coat', 'Wild Omega-3', 'Bestseller'],
      imageKeys: ['/images/products/wild-alaskan-salmon-and-krill-oil-drops.jpg'],
      ratingAvg: 4.98,
      ratingCount: 72,
      variants: [
        { sku: 'NH-OIL-16OZ', name: '16 oz Pump Bottle', priceCents: 3200, compareAtCents: 3600, stock: 48, reserved: 0 },
        { sku: 'NH-OIL-32OZ', name: '32 oz Value Refill', priceCents: 5600, compareAtCents: 6400, stock: 25, reserved: 0 },
      ],
      reviews: [
        {
          rating: 5,
          title: 'Noticed a difference in just 10 days',
          body: 'My senior dog was struggling getting up in the morning. A pump of this oil on his breakfast has noticeably reduced his stiffness. Highly recommend.',
        },
      ],
    },
    {
      slug: 'botanical-probiotic-digestive-daily-chews',
      name: 'Organic Pumpkin & 5-Strain Live Probiotic Soft Chews',
      brand: 'Botanical Bark & Whisker',
      categorySlug: 'wellness-supplements',
      description: 'Veterinarian-formulated soft bites delivering 3 billion live CFUs of spore-forming probiotics paired with soothing prebiotic pumpkin and organic ginger.',
      details: {
        specs: { Count: '90 Soft Chews', LiveCFU: '3 Billion per chew' },
        ingredients: 'Pumpkin Puree, Bacillus coagulans, Lactobacillus acidophilus, Organic Ginger Root, Brewer’s Yeast.',
        deliveryEstimate: 'Delivered in 2-4 business days',
      },
      species: [Species.DOG],
      lifeStage: ['Adult', 'Puppy', 'Senior'],
      tags: ['Digestive Health', '3 Billion CFU', 'Veterinarian-Formulated'],
      imageKeys: ['/images/products/botanical-probiotic-digestive-daily-chews.jpg'],
      ratingAvg: 4.87,
      ratingCount: 30,
      variants: [
        { sku: 'BB-PRO-90CT', name: 'Tub of 90 Soft Chews', priceCents: 2900, compareAtCents: 3400, stock: 38, reserved: 0 },
      ],
    },
  ];

  let firstVariant: { id: string; priceCents: number; name: string; sku: string } | null = null;
  let secondVariant: { id: string; priceCents: number; name: string; sku: string } | null = null;

  for (const prod of products) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) continue;

    const productRecord = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        name: prod.name,
        brand: prod.brand,
        description: prod.description,
        details: prod.details,
        categoryId,
        species: prod.species,
        lifeStage: prod.lifeStage,
        tags: prod.tags,
        imageKeys: prod.imageKeys,
        ratingAvg: prod.ratingAvg,
        ratingCount: prod.ratingCount,
        isDemo: true,
        isActive: true,
      },
      create: {
        slug: prod.slug,
        name: prod.name,
        brand: prod.brand,
        description: prod.description,
        details: prod.details,
        categoryId,
        species: prod.species,
        lifeStage: prod.lifeStage,
        tags: prod.tags,
        imageKeys: prod.imageKeys,
        ratingAvg: prod.ratingAvg,
        ratingCount: prod.ratingCount,
        isDemo: true,
        isActive: true,
      },
    });

    for (const v of prod.variants) {
      const variantRecord = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          productId: productRecord.id,
          name: v.name,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents ?? null,
          currency: 'USD',
          stock: v.stock,
          reserved: v.reserved,
        },
        create: {
          productId: productRecord.id,
          sku: v.sku,
          name: v.name,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents ?? null,
          currency: 'USD',
          stock: v.stock,
          reserved: v.reserved,
        },
      });

      if (!firstVariant) {
        firstVariant = {
          id: variantRecord.id,
          priceCents: variantRecord.priceCents,
          name: `${prod.name} - ${variantRecord.name}`,
          sku: variantRecord.sku,
        };
      } else if (!secondVariant) {
        secondVariant = {
          id: variantRecord.id,
          priceCents: variantRecord.priceCents,
          name: `${prod.name} - ${variantRecord.name}`,
          sku: variantRecord.sku,
        };
      }
    }

    // Seed Sample Reviews if present
    if (prod.reviews && prod.reviews.length > 0) {
      for (const rev of prod.reviews) {
        const existingReview = await prisma.productReview.findFirst({
          where: { productId: productRecord.id, title: rev.title },
        });
        if (!existingReview) {
          await prisma.productReview.create({
            data: {
              productId: productRecord.id,
              userId: demoUserId,
              rating: rev.rating,
              title: rev.title,
              body: rev.body,
              isSample: true,
            },
          });
        }
      }
    }
  }

  // 3. Historical Delivered Order for Demo User (Appendix B)
  const historicalOrderNumber = 'PN-ORD-SEED01';
  const existingOrder = await prisma.order.findUnique({
    where: { number: historicalOrderNumber },
  });

  if (!existingOrder && firstVariant && secondVariant) {
    const item1Qty = 1;
    const item2Qty = 2;
    const subtotal = firstVariant.priceCents * item1Qty + secondVariant.priceCents * item2Qty;
    const shipping = subtotal >= 7500 ? 0 : 1000;
    const tax = Math.round(subtotal * 0.08875);
    const total = subtotal + shipping + tax;

    const placedDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const paidDate = new Date(placedDate.getTime() + 5 * 60 * 1000);
    const shippedDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const deliveredDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

    await prisma.order.create({
      data: {
        number: historicalOrderNumber,
        userId: demoUserId,
        status: OrderStatus.DELIVERED,
        paymentMode: PaymentMode.DEMO,
        currency: 'USD',
        subtotalCents: subtotal,
        shippingCents: shipping,
        taxCents: tax,
        totalCents: total,
        isDemo: true,
        placedAt: placedDate,
        paidAt: paidDate,
        shippedAt: shippedDate,
        deliveredAt: deliveredDate,
        shippingAddress: {
          recipient: 'Maya Lin',
          line1: '142 Franklin Street',
          line2: 'Apt 4B',
          city: 'Brooklyn',
          region: 'NY',
          postalCode: '11222',
          country: 'US',
          phone: '+1 (555) 234-5678',
        },
        items: {
          create: [
            {
              variantId: firstVariant.id,
              productName: firstVariant.name.split(' - ')[0] || 'Nordic Kibble',
              variantName: firstVariant.name.split(' - ')[1] || '5 lb Bag',
              sku: firstVariant.sku,
              unitPriceCents: firstVariant.priceCents,
              quantity: item1Qty,
            },
            {
              variantId: secondVariant.id,
              productName: secondVariant.name.split(' - ')[0] || 'Biscuits',
              variantName: secondVariant.name.split(' - ')[1] || '8 oz Box',
              sku: secondVariant.sku,
              unitPriceCents: secondVariant.priceCents,
              quantity: item2Qty,
            },
          ],
        },
      },
    });
  }

  console.log('Seeded categories, products, sample reviews, and historical order successfully.');
}
