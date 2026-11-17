/* =====================================================================
   Recettes de départ — quantités pour 3 portions
   (dîner à deux + déjeuner du lendemain pour ma compagne)
   Format d'un ingrédient : [nom, quantité, unité, rayon]
   Rayons : leg = Légumes & fruits, fec = Féculents, pro = Protéines,
            cre = Crèmerie, epi = Épicerie, spi = Épices & condiments
   ===================================================================== */

const AISLES = {
  leg: "Légumes & fruits",
  fec: "Féculents",
  pro: "Protéines",
  cre: "Crèmerie",
  epi: "Épicerie",
  spi: "Épices & condiments",
  sur: "Surgelés",
  boi: "Boissons",
  hyg: "Hygiène & maison",
  div: "Divers"
};

const CATEGORIES = [
  "Soupe",
  "Légumineuses",
  "Seitan & tofu",
  "Crêpes & galettes",
  "Œufs & fromage",
  "Viande & poisson",
  "Post-training",
  "Low-carb",
  "Petit-déjeuner",
  "Desserts",
  "Goûters & en-cas",
  "Bases & pâtes"
];

/** Catégories qui ne sont pas des dîners (exclues des propositions automatiques). */
const NON_DINNER = ["Petit-déjeuner", "Desserts", "Goûters & en-cas", "Bases & pâtes"];
/** Dîners choisis à la main uniquement (jamais proposés par « Compléter les jours vides »). */
const MANUAL_ONLY = ["Post-training", "Low-carb"];

const ALL_SEASONS = ["printemps", "ete", "automne", "hiver"];
const AUT_HIV = ["automne", "hiver"];

const SEED_RECIPES = [
  /* ---------------------------- SOUPES ---------------------------- */
  {
    id: "r01", name: "Velouté de potimarron, lentilles corail & coco",
    category: "Soupe", seasons: AUT_HIV, meat: false, cookeo: true, time: 30,
    cookeoNote: "Dorer 3 min, puis cuisson sous pression 10 min.",
    ing: [
      ["potimarron", 1, "pièce", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["lentilles corail", 120, "g", "pro"],
      ["lait de coco", 200, "ml", "epi"],
      ["bouillon de légumes", 1, "cube", "epi"],
      ["graines de courge", 30, "g", "epi"],
      ["pain complet", 300, "g", "fec"],
      ["curry", 1, "c. à c.", "spi"],
      ["huile d'olive", 1, "c. à s.", "epi"]
    ],
    steps: [
      "Laver le potimarron (bio : inutile de l'éplucher), l'épépiner et le couper en cubes.",
      "Cookeo mode Dorer : faire revenir l'oignon émincé avec l'huile et le curry 3 min.",
      "Ajouter potimarron, lentilles rincées, le cube et 800 ml d'eau. Sous pression 10 min.",
      "Mixer avec le lait de coco. Servir avec les graines de courge grillées et le pain."
    ],
    notes: "Garder une portion dans un bocal pour le midi."
  },
  {
    id: "r02", name: "Soupe poireaux-pommes de terre & tartines au chèvre",
    category: "Soupe", seasons: AUT_HIV, meat: false, cookeo: true, time: 30,
    cookeoNote: "Dorer 3 min, puis sous pression 8 min.",
    ing: [
      ["poireau", 3, "pièce", "leg"],
      ["pomme de terre", 500, "g", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["bouillon de légumes", 1, "cube", "epi"],
      ["crème fraîche", 10, "cl", "cre"],
      ["fromage de chèvre", 150, "g", "cre"],
      ["noix", 40, "g", "epi"],
      ["pain de campagne", 300, "g", "fec"]
    ],
    steps: [
      "Émincer poireaux et oignon, couper les pommes de terre en cubes.",
      "Cookeo Dorer : faire suer poireaux et oignon 3 min. Ajouter pommes de terre, cube et 900 ml d'eau.",
      "Sous pression 8 min, puis mixer avec la crème.",
      "Tartines : pain + chèvre + noix concassées, 5 min sous le gril du four."
    ],
    notes: ""
  },
  {
    id: "r03", name: "Minestrone d'hiver aux haricots blancs",
    category: "Soupe", seasons: AUT_HIV, meat: false, cookeo: true, time: 35,
    cookeoNote: "Dorer 3 min, sous pression 6 min, puis mode Mijoter 8 min avec les pâtes.",
    ing: [
      ["oignon", 1, "pièce", "leg"],
      ["carotte", 2, "pièce", "leg"],
      ["poireau", 1, "pièce", "leg"],
      ["chou vert", 0.25, "pièce", "leg"],
      ["ail", 2, "gousse", "leg"],
      ["haricots blancs cuits", 250, "g", "pro"],
      ["tomates concassées", 400, "g", "epi"],
      ["coquillettes", 120, "g", "fec"],
      ["parmesan", 50, "g", "cre"],
      ["herbes de Provence", 1, "c. à c.", "spi"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Couper tous les légumes en petits dés, émincer le chou.",
      "Cookeo Dorer : oignon, ail et carottes dans l'huile 3 min.",
      "Ajouter le reste des légumes, les tomates, les herbes et 1 l d'eau. Sous pression 6 min.",
      "Ajouter haricots et coquillettes, mijoter 8 min. Servir avec le parmesan râpé."
    ],
    notes: ""
  },
  {
    id: "r04", name: "Soupe de pois cassés au cumin & croûtons",
    category: "Soupe", seasons: ["hiver"], meat: false, cookeo: true, time: 35,
    cookeoNote: "Dorer 3 min, puis sous pression 20 min.",
    ing: [
      ["pois cassés", 250, "g", "pro"],
      ["carotte", 2, "pièce", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["pomme de terre", 200, "g", "leg"],
      ["bouillon de légumes", 1, "cube", "epi"],
      ["pain complet", 200, "g", "fec"],
      ["crème fraîche", 5, "cl", "cre"],
      ["cumin", 1, "c. à c.", "spi"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Rincer les pois cassés. Couper carottes, oignon et pomme de terre.",
      "Cookeo Dorer : oignon et cumin 3 min. Ajouter le reste et 1,2 l d'eau avec le cube.",
      "Sous pression 20 min, puis mixer avec la crème.",
      "Croûtons : pain en dés, huile, 8 min à la poêle."
    ],
    notes: ""
  },
  {
    id: "r05", name: "Harira végétarienne (pois chiches & lentilles)",
    category: "Soupe", seasons: AUT_HIV, meat: false, cookeo: true, time: 35,
    cookeoNote: "Dorer 3 min, sous pression 12 min, puis Mijoter 5 min avec les vermicelles.",
    ing: [
      ["oignon", 1, "pièce", "leg"],
      ["céleri branche", 2, "pièce", "leg"],
      ["tomates concassées", 400, "g", "epi"],
      ["pois chiches cuits", 250, "g", "pro"],
      ["lentilles vertes", 80, "g", "pro"],
      ["vermicelles", 60, "g", "fec"],
      ["coriandre", 1, "botte", "leg"],
      ["citron", 1, "pièce", "leg"],
      ["pain complet", 200, "g", "fec"],
      ["ras el hanout", 1, "c. à c.", "spi"],
      ["curcuma", 1, "c. à c.", "spi"],
      ["huile d'olive", 1, "c. à s.", "epi"]
    ],
    steps: [
      "Cookeo Dorer : oignon et céleri émincés avec les épices 3 min.",
      "Ajouter tomates, lentilles rincées et 1,2 l d'eau. Sous pression 12 min.",
      "Ajouter pois chiches et vermicelles, mijoter 5 min.",
      "Servir avec la coriandre ciselée, un filet de citron et le pain."
    ],
    notes: ""
  },
  {
    id: "r06", name: "Soupe miso aux nouilles, tofu & chou chinois",
    category: "Soupe", seasons: AUT_HIV, meat: false, cookeo: false, time: 25,
    cookeoNote: "",
    ing: [
      ["pâte miso", 3, "c. à s.", "epi"],
      ["tofu ferme", 250, "g", "pro"],
      ["nouilles soba", 200, "g", "fec"],
      ["chou chinois", 0.5, "pièce", "leg"],
      ["carotte", 2, "pièce", "leg"],
      ["champignons de Paris", 150, "g", "leg"],
      ["gingembre frais", 20, "g", "leg"],
      ["sauce soja", 2, "c. à s.", "spi"]
    ],
    steps: [
      "Porter 1,2 l d'eau à frémissement avec le gingembre râpé et la sauce soja.",
      "Ajouter carottes en julienne et champignons émincés, 5 min.",
      "Ajouter chou émincé, tofu en dés et nouilles, cuire 4 min.",
      "Hors du feu, délayer le miso dans un peu de bouillon et l'ajouter (il ne doit pas bouillir)."
    ],
    notes: "Pour le midi : garder les nouilles à part pour qu'elles ne gonflent pas."
  },

  /* ------------------------- LÉGUMINEUSES ------------------------- */
  {
    id: "r07", name: "Dahl de lentilles corail & riz basmati",
    category: "Légumineuses", seasons: ALL_SEASONS, meat: false, cookeo: true, time: 30,
    cookeoNote: "Dorer 3 min, puis sous pression 8 min. Riz : 1 volume pour 1,5 d'eau, 5 min sous pression.",
    ing: [
      ["lentilles corail", 250, "g", "pro"],
      ["riz basmati", 200, "g", "fec"],
      ["oignon", 1, "pièce", "leg"],
      ["ail", 2, "gousse", "leg"],
      ["gingembre frais", 15, "g", "leg"],
      ["épinards", 200, "g", "leg"],
      ["tomates concassées", 400, "g", "epi"],
      ["lait de coco", 200, "ml", "epi"],
      ["curry", 2, "c. à c.", "spi"],
      ["huile d'olive", 1, "c. à s.", "epi"]
    ],
    steps: [
      "Cookeo Dorer : oignon, ail, gingembre et curry 3 min.",
      "Ajouter lentilles rincées, tomates, lait de coco et 400 ml d'eau. Sous pression 8 min.",
      "Incorporer les épinards, laisser tomber 2 min en mode Mijoter.",
      "Servir avec le riz basmati."
    ],
    notes: "En été, remplacer les épinards par des courgettes."
  },
  {
    id: "r08", name: "Curry de pois chiches & patate douce",
    category: "Légumineuses", seasons: AUT_HIV, meat: false, cookeo: true, time: 30,
    cookeoNote: "Dorer 3 min, puis sous pression 6 min.",
    ing: [
      ["pois chiches cuits", 400, "g", "pro"],
      ["patate douce", 600, "g", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["coriandre", 1, "botte", "leg"],
      ["lait de coco", 400, "ml", "epi"],
      ["tomates concassées", 200, "g", "epi"],
      ["riz complet", 200, "g", "fec"],
      ["curry", 2, "c. à c.", "spi"],
      ["huile d'olive", 1, "c. à s.", "epi"]
    ],
    steps: [
      "Lancer la cuisson du riz complet (25 min à la casserole).",
      "Cookeo Dorer : oignon et curry 3 min. Ajouter la patate douce en cubes, les pois chiches, les tomates et le lait de coco.",
      "Sous pression 6 min.",
      "Parsemer de coriandre et servir avec le riz."
    ],
    notes: ""
  },
  {
    id: "r09", name: "Chili sin carne",
    category: "Légumineuses", seasons: ALL_SEASONS, meat: false, cookeo: true, time: 35,
    cookeoNote: "Dorer 3 min, puis sous pression 10 min.",
    ing: [
      ["haricots rouges cuits", 400, "g", "pro"],
      ["oignon", 1, "pièce", "leg"],
      ["carotte", 2, "pièce", "leg"],
      ["ail", 2, "gousse", "leg"],
      ["tomates concassées", 400, "g", "epi"],
      ["riz complet", 200, "g", "fec"],
      ["fromage râpé", 60, "g", "cre"],
      ["cumin", 1, "c. à c.", "spi"],
      ["paprika fumé", 1, "c. à c.", "spi"],
      ["huile d'olive", 1, "c. à s.", "epi"]
    ],
    steps: [
      "Cuire le riz complet.",
      "Cookeo Dorer : oignon, ail, carottes en petits dés et épices 3 min.",
      "Ajouter tomates et haricots égouttés. Sous pression 10 min.",
      "Servir avec le riz et le fromage râpé."
    ],
    notes: "En été : ajouter 1 poivron et 1 courgette."
  },
  {
    id: "r10", name: "Lentilles vertes, carottes fondantes & œufs mollets",
    category: "Légumineuses", seasons: ["printemps", "automne", "hiver"], meat: false, cookeo: true, time: 30,
    cookeoNote: "Dorer 2 min, puis sous pression 12 min.",
    ing: [
      ["lentilles vertes", 250, "g", "pro"],
      ["œufs", 4, "pièce", "pro"],
      ["carotte", 3, "pièce", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["ail", 1, "gousse", "leg"],
      ["boulgour", 150, "g", "fec"],
      ["moutarde", 1, "c. à s.", "spi"],
      ["thym", 1, "c. à c.", "spi"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Cookeo Dorer : oignon et ail 2 min. Ajouter lentilles, carottes en rondelles, thym et 750 ml d'eau.",
      "Sous pression 12 min. Assaisonner avec la moutarde et l'huile.",
      "Œufs mollets : 6 min dans l'eau bouillante, puis eau froide.",
      "Servir avec le boulgour (10 min de cuisson)."
    ],
    notes: "Pour le midi : se mange aussi tiède en salade."
  },
  {
    id: "r11", name: "Couscous végétarien aux pois chiches",
    category: "Légumineuses", seasons: AUT_HIV, meat: false, cookeo: true, time: 40,
    cookeoNote: "Dorer 3 min, puis sous pression 8 min.",
    ing: [
      ["pois chiches cuits", 400, "g", "pro"],
      ["semoule complète", 250, "g", "fec"],
      ["carotte", 3, "pièce", "leg"],
      ["navet", 2, "pièce", "leg"],
      ["potiron", 400, "g", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["tomates concassées", 400, "g", "epi"],
      ["raisins secs", 40, "g", "epi"],
      ["ras el hanout", 2, "c. à c.", "spi"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Cookeo Dorer : oignon et ras el hanout 3 min.",
      "Ajouter légumes en gros morceaux, tomates, pois chiches et 500 ml d'eau. Sous pression 8 min.",
      "Semoule : volume égal d'eau bouillante salée + huile, 5 min à couvert, égrainer.",
      "Servir avec les raisins secs."
    ],
    notes: "En été : courgettes et poivrons à la place du navet et du potiron."
  },
  {
    id: "r12", name: "Boulettes de pois chiches au four, boulgour & sauce yaourt",
    category: "Légumineuses", seasons: ["printemps", "ete"], meat: false, cookeo: false, time: 45,
    cookeoNote: "",
    ing: [
      ["pois chiches cuits", 400, "g", "pro"],
      ["farine de pois chiches", 40, "g", "epi"],
      ["oignon rouge", 1, "pièce", "leg"],
      ["ail", 1, "gousse", "leg"],
      ["persil", 1, "botte", "leg"],
      ["concombre", 1, "pièce", "leg"],
      ["tomate", 3, "pièce", "leg"],
      ["citron", 1, "pièce", "leg"],
      ["boulgour", 200, "g", "fec"],
      ["yaourt nature", 250, "g", "cre"],
      ["cumin", 1, "c. à c.", "spi"],
      ["huile d'olive", 3, "c. à s.", "epi"]
    ],
    steps: [
      "Mixer pois chiches, oignon, ail, persil, cumin et farine. Former 15 boulettes.",
      "Badigeonner d'huile, cuire 25 min à 200 °C en retournant à mi-cuisson.",
      "Cuire le boulgour, mélanger avec tomate et concombre en dés et du citron.",
      "Sauce : yaourt, citron, sel, poivre."
    ],
    notes: ""
  },

  /* ------------------------- SEITAN & TOFU ------------------------ */
  {
    id: "r13", name: "Seitan maison braisé aux carottes & purée",
    category: "Seitan & tofu", seasons: AUT_HIV, meat: false, cookeo: true, time: 60,
    cookeoNote: "Seitan : Dorer 3 min, puis sous pression 20 min dans le bouillon.",
    ing: [
      ["gluten de blé", 150, "g", "epi"],
      ["farine de pois chiches", 30, "g", "epi"],
      ["sauce soja", 3, "c. à s.", "spi"],
      ["bouillon de légumes", 2, "cube", "epi"],
      ["carotte", 4, "pièce", "leg"],
      ["oignon", 2, "pièce", "leg"],
      ["pomme de terre", 800, "g", "leg"],
      ["lait", 15, "cl", "cre"],
      ["beurre", 20, "g", "cre"],
      ["thym", 1, "c. à c.", "spi"]
    ],
    steps: [
      "Seitan : mélanger gluten, farine de pois chiches, 2 c. à s. de sauce soja et 12 cl d'eau. Pétrir 2 min, former un boudin, couper en 6.",
      "Cookeo Dorer : oignons émincés 3 min. Ajouter carottes en rondelles, seitan, thym, le reste de soja et 600 ml d'eau avec les cubes.",
      "Sous pression 20 min.",
      "En parallèle, purée : pommes de terre cuites à l'eau, écrasées avec lait et beurre."
    ],
    notes: "Astuce : doubler la dose de seitan et congeler la moitié pour un autre plat."
  },
  {
    id: "r14", name: "Bourguignon de seitan & tagliatelles",
    category: "Seitan & tofu", seasons: AUT_HIV, meat: false, cookeo: true, time: 40,
    cookeoNote: "Dorer 5 min, puis sous pression 10 min.",
    ing: [
      ["seitan", 350, "g", "pro"],
      ["champignons de Paris", 250, "g", "leg"],
      ["carotte", 3, "pièce", "leg"],
      ["oignon", 2, "pièce", "leg"],
      ["ail", 2, "gousse", "leg"],
      ["vin rouge", 25, "cl", "epi"],
      ["concentré de tomate", 1, "c. à s.", "epi"],
      ["farine", 10, "g", "epi"],
      ["tagliatelles", 250, "g", "fec"],
      ["thym", 1, "c. à c.", "spi"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Cookeo Dorer : seitan en cubes dans l'huile, puis oignons, ail et champignons, 5 min. Saupoudrer de farine.",
      "Ajouter carottes, vin, concentré, thym et 200 ml d'eau. Sous pression 10 min.",
      "Cuire les tagliatelles et servir avec la sauce."
    ],
    notes: "Encore meilleur réchauffé le lendemain midi."
  },
  {
    id: "r15", name: "Seitan sauté au brocoli, soja-gingembre & soba",
    category: "Seitan & tofu", seasons: AUT_HIV, meat: false, cookeo: false, time: 25,
    cookeoNote: "",
    ing: [
      ["seitan", 300, "g", "pro"],
      ["brocoli", 1, "pièce", "leg"],
      ["carotte", 2, "pièce", "leg"],
      ["gingembre frais", 20, "g", "leg"],
      ["ail", 2, "gousse", "leg"],
      ["nouilles soba", 200, "g", "fec"],
      ["sauce soja", 3, "c. à s.", "spi"],
      ["graines de sésame", 2, "c. à s.", "epi"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Cuire les nouilles soba 4 min, rincer à l'eau froide.",
      "Faire dorer le seitan émincé dans l'huile 5 min à feu vif.",
      "Ajouter brocoli en fleurettes, carottes en julienne, ail et gingembre, 6 min.",
      "Ajouter nouilles et sauce soja, mélanger, parsemer de sésame."
    ],
    notes: ""
  },
  {
    id: "r16", name: "Tofu fumé, choux de Bruxelles rôtis & boulgour moutarde",
    category: "Seitan & tofu", seasons: ["hiver"], meat: false, cookeo: false, time: 35,
    cookeoNote: "",
    ing: [
      ["tofu fumé", 250, "g", "pro"],
      ["choux de Bruxelles", 500, "g", "leg"],
      ["oignon rouge", 1, "pièce", "leg"],
      ["boulgour", 200, "g", "fec"],
      ["moutarde à l'ancienne", 1, "c. à s.", "spi"],
      ["miel", 1, "c. à s.", "epi"],
      ["sauce soja", 1, "c. à s.", "spi"],
      ["huile d'olive", 3, "c. à s.", "epi"]
    ],
    steps: [
      "Couper les choux en deux, l'oignon en quartiers, le tofu en dés.",
      "Mélanger avec huile, sauce soja et miel. Rôtir 25 min à 200 °C.",
      "Cuire le boulgour, l'assaisonner avec la moutarde.",
      "Servir le tout ensemble."
    ],
    notes: ""
  },
  {
    id: "r17", name: "Riz sauté au tofu, chou chinois & œufs",
    category: "Seitan & tofu", seasons: AUT_HIV, meat: false, cookeo: true, time: 25,
    cookeoNote: "Riz complet : 1 volume pour 1,5 d'eau, sous pression 15 min (ou utiliser du riz de la veille).",
    ing: [
      ["tofu ferme", 250, "g", "pro"],
      ["œufs", 2, "pièce", "pro"],
      ["riz complet", 200, "g", "fec"],
      ["chou chinois", 0.5, "pièce", "leg"],
      ["carotte", 2, "pièce", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["gingembre frais", 10, "g", "leg"],
      ["sauce soja", 3, "c. à s.", "spi"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Cuire le riz (idéalement la veille, il se tient mieux).",
      "Dorer le tofu en dés dans l'huile, réserver.",
      "Sauter oignon, carottes, gingembre puis chou émincé 5 min.",
      "Ajouter riz, tofu et sauce soja, pousser sur le côté et brouiller les œufs dans la poêle."
    ],
    notes: ""
  },
  {
    id: "r18", name: "Curry vert de tofu, courgettes & riz",
    category: "Seitan & tofu", seasons: ["ete"], meat: false, cookeo: true, time: 30,
    cookeoNote: "Dorer 3 min, puis sous pression 3 min (les légumes restent croquants).",
    ing: [
      ["tofu ferme", 300, "g", "pro"],
      ["courgette", 2, "pièce", "leg"],
      ["poivron", 1, "pièce", "leg"],
      ["haricots verts", 200, "g", "leg"],
      ["basilic", 1, "botte", "leg"],
      ["citron vert", 1, "pièce", "leg"],
      ["lait de coco", 400, "ml", "epi"],
      ["pâte de curry vert", 1, "c. à s.", "spi"],
      ["riz basmati", 200, "g", "fec"]
    ],
    steps: [
      "Cuire le riz.",
      "Cookeo Dorer : pâte de curry 1 min, puis tofu en dés 2 min.",
      "Ajouter légumes coupés et lait de coco. Sous pression 3 min.",
      "Finir avec basilic et jus de citron vert."
    ],
    notes: ""
  },
  {
    id: "r19", name: "Brochettes de seitan mariné, légumes grillés & semoule",
    category: "Seitan & tofu", seasons: ["ete"], meat: false, cookeo: false, time: 40,
    cookeoNote: "",
    ing: [
      ["seitan", 350, "g", "pro"],
      ["courgette", 2, "pièce", "leg"],
      ["poivron", 1, "pièce", "leg"],
      ["oignon rouge", 1, "pièce", "leg"],
      ["tomates cerises", 250, "g", "leg"],
      ["citron", 1, "pièce", "leg"],
      ["ail", 1, "gousse", "leg"],
      ["semoule complète", 200, "g", "fec"],
      ["sauce soja", 2, "c. à s.", "spi"],
      ["herbes de Provence", 1, "c. à c.", "spi"],
      ["huile d'olive", 4, "c. à s.", "epi"]
    ],
    steps: [
      "Mariner le seitan en cubes 20 min : huile, soja, citron, ail, herbes.",
      "Monter les brochettes en alternant seitan et légumes.",
      "Griller 12 min (plancha, barbecue ou four en position gril).",
      "Servir avec la semoule."
    ],
    notes: ""
  },

  /* ----------------------- CRÊPES & GALETTES ---------------------- */
  {
    id: "r20", name: "Galettes de sarrasin complètes aux champignons",
    category: "Crêpes & galettes", seasons: ALL_SEASONS, meat: false, cookeo: false, time: 40,
    cookeoNote: "",
    ing: [
      ["farine de sarrasin", 250, "g", "fec"],
      ["œufs", 6, "pièce", "pro"],
      ["comté râpé", 120, "g", "cre"],
      ["champignons de Paris", 250, "g", "leg"],
      ["échalote", 1, "pièce", "leg"],
      ["salade verte", 1, "pièce", "leg"],
      ["beurre", 20, "g", "cre"]
    ],
    steps: [
      "Pâte : farine + 1 c. à c. de sel + 50 cl d'eau froide. Repos 1 h (ou préparer la veille).",
      "Poêler les champignons avec l'échalote.",
      "Cuire une galette, casser un œuf au centre, ajouter comté et champignons, replier les bords.",
      "Servir avec la salade."
    ],
    notes: "Pour le midi : garder 2 galettes garnies, à réchauffer à la poêle."
  },
  {
    id: "r21", name: "Crêpes gratinées épinards-ricotta",
    category: "Crêpes & galettes", seasons: ["printemps", "automne", "hiver"], meat: false, cookeo: false, time: 50,
    cookeoNote: "",
    ing: [
      ["farine T45", 250, "g", "fec"],
      ["œufs", 3, "pièce", "pro"],
      ["lait", 50, "cl", "cre"],
      ["beurre", 30, "g", "cre"],
      ["épinards", 500, "g", "leg"],
      ["ail", 1, "gousse", "leg"],
      ["ricotta", 250, "g", "cre"],
      ["emmental râpé", 80, "g", "cre"],
      ["muscade", 1, "pincée", "spi"]
    ],
    steps: [
      "Pâte : farine, œufs, lait, beurre fondu. Repos 30 min, puis cuire 8 crêpes.",
      "Faire tomber les épinards avec l'ail, égoutter, mélanger avec ricotta et muscade.",
      "Garnir et rouler les crêpes, les ranger dans un plat.",
      "Couvrir d'emmental, gratiner 15 min à 200 °C."
    ],
    notes: ""
  },
  {
    id: "r22", name: "Galettes de sarrasin poireaux & chèvre",
    category: "Crêpes & galettes", seasons: AUT_HIV, meat: false, cookeo: false, time: 40,
    cookeoNote: "",
    ing: [
      ["farine de sarrasin", 250, "g", "fec"],
      ["poireau", 3, "pièce", "leg"],
      ["fromage de chèvre", 150, "g", "cre"],
      ["crème fraîche", 10, "cl", "cre"],
      ["œufs", 3, "pièce", "pro"],
      ["noix", 40, "g", "epi"],
      ["salade verte", 1, "pièce", "leg"],
      ["beurre", 20, "g", "cre"]
    ],
    steps: [
      "Pâte : farine + 1 c. à c. de sel + 50 cl d'eau froide. Repos 1 h.",
      "Fondue de poireaux : émincer, cuire 15 min au beurre, ajouter la crème.",
      "Garnir chaque galette de fondue, de chèvre, d'un œuf et de noix.",
      "Servir avec la salade."
    ],
    notes: ""
  },

  /* ------------------------ ŒUFS & FROMAGE ------------------------ */
  {
    id: "r23", name: "Risotto petits pois, asperges & parmesan",
    category: "Œufs & fromage", seasons: ["printemps"], meat: false, cookeo: true, time: 30,
    cookeoNote: "Dorer 3 min, puis sous pression 6 min.",
    ing: [
      ["riz arborio", 250, "g", "fec"],
      ["asperges vertes", 1, "botte", "leg"],
      ["petits pois", 300, "g", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["citron", 1, "pièce", "leg"],
      ["vin blanc", 10, "cl", "epi"],
      ["bouillon de légumes", 1, "cube", "epi"],
      ["parmesan", 60, "g", "cre"],
      ["beurre", 20, "g", "cre"]
    ],
    steps: [
      "Cookeo Dorer : oignon et riz 3 min jusqu'à ce que le riz soit nacré. Déglacer au vin blanc.",
      "Ajouter 700 ml de bouillon, les petits pois et les asperges en tronçons (pointes à part).",
      "Sous pression 6 min.",
      "Ajouter les pointes d'asperges, le parmesan, le beurre et le zeste de citron."
    ],
    notes: ""
  },
  {
    id: "r24", name: "Shakshuka & semoule",
    category: "Œufs & fromage", seasons: ["ete"], meat: false, cookeo: false, time: 30,
    cookeoNote: "",
    ing: [
      ["œufs", 6, "pièce", "pro"],
      ["poivron", 2, "pièce", "leg"],
      ["tomate", 800, "g", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["ail", 2, "gousse", "leg"],
      ["coriandre", 1, "botte", "leg"],
      ["feta", 100, "g", "cre"],
      ["semoule complète", 200, "g", "fec"],
      ["cumin", 1, "c. à c.", "spi"],
      ["paprika", 1, "c. à c.", "spi"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Faire revenir oignon, ail et poivrons émincés 8 min avec les épices.",
      "Ajouter les tomates en dés, compoter 10 min.",
      "Creuser des puits, casser les œufs, couvrir et cuire 6 min.",
      "Parsemer de feta et coriandre. Servir avec la semoule."
    ],
    notes: "Pour le midi : garder 2 œufs avec la sauce, réchauffer doucement."
  },
  {
    id: "r25", name: "Ratatouille au Cookeo, œufs au plat & quinoa",
    category: "Œufs & fromage", seasons: ["ete"], meat: false, cookeo: true, time: 35,
    cookeoNote: "Dorer 5 min, puis sous pression 6 min.",
    ing: [
      ["aubergine", 1, "pièce", "leg"],
      ["courgette", 2, "pièce", "leg"],
      ["poivron", 2, "pièce", "leg"],
      ["tomate", 600, "g", "leg"],
      ["oignon", 1, "pièce", "leg"],
      ["ail", 2, "gousse", "leg"],
      ["œufs", 5, "pièce", "pro"],
      ["quinoa", 200, "g", "fec"],
      ["herbes de Provence", 1, "c. à c.", "spi"],
      ["huile d'olive", 3, "c. à s.", "epi"]
    ],
    steps: [
      "Cookeo Dorer : oignon, ail et poivrons dans l'huile 5 min.",
      "Ajouter aubergine, courgettes, tomates et herbes. Sous pression 6 min.",
      "Cuire le quinoa 12 min.",
      "Cuire les œufs au plat et les poser sur la ratatouille."
    ],
    notes: ""
  },
  {
    id: "r26", name: "Gratin de coquillettes au chou-fleur & comté",
    category: "Œufs & fromage", seasons: AUT_HIV, meat: false, cookeo: true, time: 45,
    cookeoNote: "Chou-fleur à la vapeur dans le panier : sous pression 3 min.",
    ing: [
      ["coquillettes", 250, "g", "fec"],
      ["chou-fleur", 1, "pièce", "leg"],
      ["comté râpé", 120, "g", "cre"],
      ["lait", 50, "cl", "cre"],
      ["beurre", 30, "g", "cre"],
      ["farine T45", 30, "g", "fec"],
      ["muscade", 1, "pincée", "spi"]
    ],
    steps: [
      "Cuire le chou-fleur en fleurettes à la vapeur et les coquillettes al dente.",
      "Béchamel : beurre fondu + farine, puis le lait en fouettant jusqu'à épaississement. Muscade.",
      "Mélanger dans un plat avec la moitié du comté, couvrir du reste.",
      "Gratiner 20 min à 200 °C."
    ],
    notes: ""
  },
  {
    id: "r27", name: "Quiche poireaux-chèvre (pâte maison) & salade",
    category: "Œufs & fromage", seasons: AUT_HIV, meat: false, cookeo: false, time: 70,
    cookeoNote: "",
    ing: [
      ["farine T45", 200, "g", "fec"],
      ["beurre", 100, "g", "cre"],
      ["œufs", 3, "pièce", "pro"],
      ["crème fraîche", 20, "cl", "cre"],
      ["lait", 10, "cl", "cre"],
      ["poireau", 3, "pièce", "leg"],
      ["fromage de chèvre", 150, "g", "cre"],
      ["salade verte", 1, "pièce", "leg"],
      ["muscade", 1, "pincée", "spi"]
    ],
    steps: [
      "Pâte : farine + beurre froid en dés + 1 pincée de sel, sabler, ajouter 5 cl d'eau. Repos 30 min.",
      "Fondre les poireaux émincés 15 min dans un peu de beurre.",
      "Foncer le moule, garnir de poireaux et de chèvre, verser œufs + crème + lait + muscade.",
      "Cuire 35 min à 190 °C. Servir avec la salade."
    ],
    notes: "Parfaite froide pour le midi."
  },
  {
    id: "r28", name: "Pâtes primavera, ricotta & citron",
    category: "Œufs & fromage", seasons: ["printemps"], meat: false, cookeo: false, time: 25,
    cookeoNote: "",
    ing: [
      ["spaghetti", 250, "g", "fec"],
      ["asperges vertes", 1, "botte", "leg"],
      ["petits pois", 200, "g", "leg"],
      ["courgette", 1, "pièce", "leg"],
      ["citron", 1, "pièce", "leg"],
      ["ail", 1, "gousse", "leg"],
      ["menthe", 1, "botte", "leg"],
      ["ricotta", 200, "g", "cre"],
      ["parmesan", 40, "g", "cre"],
      ["huile d'olive", 2, "c. à s.", "epi"]
    ],
    steps: [
      "Cuire les pâtes, ajouter petits pois et asperges en tronçons les 4 dernières minutes.",
      "Faire revenir ail et courgette en dés dans l'huile 4 min.",
      "Mélanger le tout avec ricotta, zeste et jus de citron, parmesan et menthe ciselée."
    ],
    notes: ""
  },
  {
    id: "r29", name: "Tortilla de pommes de terre & salade verte",
    category: "Œufs & fromage", seasons: ALL_SEASONS, meat: false, cookeo: false, time: 40,
    cookeoNote: "",
    ing: [
      ["pomme de terre", 700, "g", "leg"],
      ["oignon", 2, "pièce", "leg"],
      ["œufs", 7, "pièce", "pro"],
      ["salade verte", 1, "pièce", "leg"],
      ["huile d'olive", 4, "c. à s.", "epi"]
    ],
    steps: [
      "Cuire pommes de terre en fines lamelles et oignons dans l'huile à feu doux 20 min.",
      "Battre les œufs, y mélanger les pommes de terre égouttées.",
      "Cuire dans la poêle 8 min à feu doux, retourner à l'aide d'une assiette, 4 min.",
      "Servir tiède avec la salade."
    ],
    notes: "Idéale froide en boîte à déjeuner."
  },
  {
    id: "r30", name: "Pizza maison aux légumes du soleil",
    category: "Œufs & fromage", seasons: ["ete"], meat: false, cookeo: false, time: 60,
    cookeoNote: "",
    ing: [
      ["farine T65", 400, "g", "fec"],
      ["levure de boulanger", 1, "sachet", "epi"],
      ["coulis de tomate", 200, "g", "epi"],
      ["mozzarella", 250, "g", "cre"],
      ["courgette", 1, "pièce", "leg"],
      ["poivron", 1, "pièce", "leg"],
      ["oignon rouge", 1, "pièce", "leg"],
      ["basilic", 1, "botte", "leg"],
      ["olives noires", 50, "g", "epi"],
      ["huile d'olive", 3, "c. à s.", "epi"]
    ],
    steps: [
      "Pâte : farine, levure, 1 c. à c. de sel, 2 c. à s. d'huile, 25 cl d'eau tiède. Pétrir, laisser lever 1 h.",
      "Étaler en 2 pizzas, couvrir de coulis.",
      "Ajouter légumes en fines lamelles, mozzarella et olives.",
      "Cuire 12-15 min à 250 °C, finir avec le basilic."
    ],
    notes: "Une part pour le midi, à réchauffer au four."
  },

  /* ------------------------- BASES & PÂTES ------------------------ */
  {
    id: "r34", since: 2, name: "Pâte brisée maison (pour quiche ou tarte)",
    category: "Bases & pâtes", seasons: ALL_SEASONS, meat: false, cookeo: false, time: 15,
    cookeoNote: "",
    ing: [
      ["farine T45", 250, "g", "fec"],
      ["beurre", 125, "g", "cre"],
      ["sel", 1, "pincée", "spi"],
      ["eau", 60, "ml", "epi"]
    ],
    steps: [
      "Mélanger farine et sel, ajouter le beurre froid en dés.",
      "Sabler du bout des doigts jusqu'à obtenir une texture de sable.",
      "Ajouter l'eau froide petit à petit, former une boule sans trop travailler.",
      "Filmer et laisser reposer 30 min au frais avant d'étaler (moule de 28 cm)."
    ],
    notes: "Se congèle très bien : préparer une double dose."
  }
];
