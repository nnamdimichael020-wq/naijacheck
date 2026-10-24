export type PostalAreaCrossLink = {
  label: string;
  href: string;
};

export type PostalAreaExtra = {
  intro: string;
  bullets: string[];
  faqExtra: { q: string; a: string };
  crossLinks: PostalAreaCrossLink[];
};

const POSTAL_AREA_EXTRAS: Record<string, PostalAreaExtra> = {
  "lagos:ikeja": {
    intro:
      "Ikeja is the capital of Lagos State and its mainland aviation and administrative hub — Murtala Muhammed Airport, Computer Village (Otigba), and the Alausa secretariat sit across the 100271–100282 delivery blocks rather than the 100001 GPO box counter.",
    bullets: [
      "100001 = Ikeja GPO head office (post office boxes & general state sorting counter)",
      "100271 = Ikeja GRA & Maryland — primary code for residential & corporate streets",
      "100281–100282 = Opebi, Allen Avenue & Alausa business strips off Obafemi Awolowo Way",
    ],
    faqExtra: {
      q: "Should I enter 100001 or 100271 for an Ikeja street address?",
      a: "Enter 100271 for homes, hotels and offices in Ikeja GRA or Maryland. Reserve 100001 for P.O. Box mail addressed directly to the Ikeja General Post Office or when a foreign checkout rejects sub-district codes.",
    },
    crossLinks: [
      { label: "Ikeja LGA (/geo/lagos/ikeja)", href: "/geo/lagos/ikeja" },
      { label: "Murtala Muhammed Airport (LOS)", href: "/airports/lagos-murtala-muhammed" },
    ],
  },
  "lagos:victoria-island": {
    intro:
      "Victoria Island (VI) is Nigeria’s flagship corporate, banking and diplomatic district — Adeola Odeku, Akin Adesola, Ajose Adeogun and Ahmadu Bello Way route through Lagos Island dispatch 101 under delivery code 101241.",
    bullets: [
      "101241 = Victoria Island & Oniru — commercial towers, hotels & bank headquarters",
      "101233 = Ikoyi — neighbouring island across Falomo Bridge, separate delivery van",
      "105102 = Lekki Phase 1 — crosses into the 105 Eti-Osa/Lekki dispatch block",
    ],
    faqExtra: {
      q: "Why do Victoria Island (101241) and Lekki Phase 1 (105102) have different prefixes?",
      a: "Victoria Island sorts under Lagos Island dispatch 101, while Lekki Phase 1 sorts under the eastern 105 dispatch corridor across the Lekki–Ikoyi and Ozumba Mbadiwe axis.",
    },
    crossLinks: [
      { label: "Eti-Osa LGA (/geo/lagos/eti-osa)", href: "/geo/lagos/eti-osa" },
      { label: "Commercial bank headquarters (/codes/banks)", href: "/codes/banks" },
    ],
  },
  "lagos:lekki": {
    intro:
      "Lekki Phase 1 anchors the western Eti-Osa peninsula — Admiralty Way, Ikate and the Lekki Phase 1 residential schemes use 105102, one digit apart from the wider Sangotedo/Ajah/Ibeju-Lekki 105101 corridor.",
    bullets: [
      "105102 = Lekki Phase 1 gated layouts, Admiralty Way & Ikate",
      "105101 = Sangotedo, Abraham Adesanya & Ibeju-Lekki Free Zone belt",
      "101241 = Victoria Island / Oniru west of the Lekki toll gate",
    ],
    faqExtra: {
      q: "Can I use 105101 for Lekki Phase 1?",
      a: "Prefer 105102 for Lekki Phase 1 streets (Admiralty Way, Fola Osibo, Freedom Way). 105101 serves the eastern Lekki–Ajah–Ibeju corridor further down the expressway.",
    },
    crossLinks: [
      { label: "Eti-Osa LGA (/geo/lagos/eti-osa)", href: "/geo/lagos/eti-osa" },
      { label: "Lekki Deep Sea Port (NGLKK)", href: "/ports/lekki-deep-sea-port" },
    ],
  },
  "lagos:surulere": {
    intro:
      "Surulere sits at the heart of central Lagos Mainland — Adeniran Ogunsanya, Bode Thomas, Ogunlana Drive and the National Stadium axis fall under the 101281–101283 delivery range, led by 101283.",
    bullets: [
      "101283 = Central Surulere (Adeniran Ogunsanya, Bode Thomas, Aguda & Ijesha)",
      "101212 = Neighbouring Yaba across Western Avenue / Ojuelegba",
      "100253 = Neighbouring Mushin / Idi-Araba north of Itire Road",
    ],
    faqExtra: {
      q: "Why does Surulere start with 101 instead of 100?",
      a: "Historically NIPOST grouped Surulere, Yaba, Ebute Metta and Lagos Island under the southern 101 dispatch district, whereas northern mainland LGAs (Ikeja, Mushin, Oshodi, Agege) use 100.",
    },
    crossLinks: [{ label: "Surulere LGA (/geo/lagos/surulere)", href: "/geo/lagos/surulere" }],
  },
  "lagos:ikorodu": {
    intro:
      "Ikorodu is a major lagoon-side city and industrial LGA northeast of Kosofe — Ikorodu town, Ebute, Igbogbo and Ita-Elewa use the dedicated 104 dispatch block anchored at 104101.",
    bullets: [
      "104101 = Ikorodu urban & peri-urban delivery (Igbogbo,pakodo, Agric, Benson)",
      "104001–104233 = Wider Ikorodu LGA range including Imota & Ijede",
      "100242 = Kosofe / Mile 12 / Ketu before crossing Majidun Creek into Ikorodu",
    ],
    faqExtra: {
      q: "Should Ikorodu residents ever enter 100001?",
      a: "No — Ikorodu has its own 3-digit NIPOST dispatch centre (104). Using 104101 routes parcels directly to the Ikorodu corridor instead of Ikeja.",
    },
    crossLinks: [{ label: "Ikorodu LGA (/geo/lagos/ikorodu)", href: "/geo/lagos/ikorodu" }],
  },
  "lagos:yaba": {
    intro:
      "Yaba is Lagos Mainland’s university, medical and technology corridor — Herbert Macaulay Way, Sabo, Tejuosho, Yabatech and the University of Lagos (Akoka) sit on 101212.",
    bullets: [
      "101212 = Yaba, Sabo, Akoka (UNILAG) & Onike",
      "101211 = Adjacent Ebute Metta & Nigerian Railway compound",
      "100234 = Gbagada north-east along the Third Mainland / Ikorodu Road link",
    ],
    faqExtra: {
      q: "Does UNILAG Akoka use Yaba’s 101212 code?",
      a: "Yes — Akoka, Sabo and Onike sit within the Yaba / Lagos Mainland 101212 delivery district unless mail is addressed to a private institutional P.O. Box.",
    },
    crossLinks: [{ label: "Lagos Mainland LGA (/geo/lagos/lagos-mainland)", href: "/geo/lagos/lagos-mainland" }],
  },
  "lagos:apapa": {
    intro:
      "Apapa is Nigeria’s busiest maritime, customs-clearing and tank-farm district — Apapa GRA, Wharf Road, Creek Road and the Tin Can port approach use 102272 (with 101251–101254 also recorded on older quayside street tables).",
    bullets: [
      "102272 = Apapa GRA, Marine Beach & Tin Can commercial shipping corridor",
      "101251–101254 = Older NIPOST street splits cited for Apapa Quays & Creek Road",
      "102103 = Adjacent Ajegunle / Ajeromi-Ifelodun west of Boundary",
    ],
    faqExtra: {
      q: "Why do shipping directories show both 102272 and 101253 for Apapa?",
      a: "Public NIPOST compilations split Apapa between the 102 western port corridor (102272, BusinessConnect) and legacy 101251–101254 quayside street tables (NigeriaZipCode / Apartments.ng). Both appear on customs and logistics forms; we list 102272 as primary and document 101251–101254 openly.",
    },
    crossLinks: [
      { label: "Apapa LGA (/geo/lagos/apapa)", href: "/geo/lagos/apapa" },
      { label: "Lagos Port Complex Apapa (NGAPP)", href: "/ports/lagos-apapa-port" },
      { label: "Tin Can Island Port (NGTIN)", href: "/ports/tin-can-island-port" },
    ],
  },
  "lagos:ikoyi": {
    intro:
      "Ikoyi covers old colonial residential avenues and modern high-rise waterfront estates in Eti-Osa — Awolowo Road, Bourdillon, Alexander, Gerrard Road, Osborne Foreshore and Banana Island route under 101233.",
    bullets: [
      "101233 = Old Ikoyi, Awolowo Road, Dolphin, Osborne & Banana Island",
      "101232 = Obalende transit & market border immediately west of Ikoyi",
      "101241 = Victoria Island south across Falomo Bridge",
    ],
    faqExtra: {
      q: "Does Banana Island use Ikoyi’s 101233 postal code?",
      a: "Yes — public Lagos postal directories group Banana Island, Parkview and Osborne Foreshore under Ikoyi’s 101233 delivery district.",
    },
    crossLinks: [
      { label: "Eti-Osa LGA (/geo/lagos/eti-osa)", href: "/geo/lagos/eti-osa" },
      { label: "Commercial bank directory (/codes/banks)", href: "/codes/banks" },
    ],
  },
  "lagos:ajah": {
    intro:
      "Ajah sits at the eastern hinge of Eti-Osa and the Sangotedo/Ibeju-Lekki growth corridor — one of Nigeria’s most-searched postal lookups because two public NIPOST compilations record different codes (105101 vs 101245).",
    bullets: [
      "105101 = Ajah, Abraham Adesanya, Sangotedo & eastern Lekki–Epe corridor (BusinessConnect)",
      "101245 = Eti-Osa’s Ilaje/Badore/Ajah urban split in Apartments.ng & NigeriaZipCode",
      "105102 = Lekki Phase 1 further west toward Admiralty Way",
    ],
    faqExtra: {
      q: "Should I use 105101 or 101245 for Ajah?",
      a: "For Sangotedo, Abraham Adesanya, Ogombo and estates continuing toward Ibeju-Lekki, 105101 is standard. For Badore, Ilaje-Ajah and addresses strictly within Eti-Osa’s older eastern ward list, some forms also accept 101245 — always include 'Ajah, Eti-Osa, Lagos' in the address line.",
    },
    crossLinks: [
      { label: "Eti-Osa LGA (/geo/lagos/eti-osa)", href: "/geo/lagos/eti-osa" },
      { label: "Ibeju-Lekki LGA (/geo/lagos/ibeju-lekki)", href: "/geo/lagos/ibeju-lekki" },
    ],
  },
  "fct-abuja:garki": {
    intro:
      "Garki hosts NIPOST’s corporate headquarters (Muhammadu Buhari Way, Garki 900001) as well as residential and commercial Areas 1, 2, 3, 7, 8, 10 and 11, which step from 900241 through 900247.",
    bullets: [
      "900001 = Abuja GPO / NIPOST HQ mailroom & postboxes",
      "900241–900247 = Garki Areas 1, 2, 3, 7, 8, 10 & 11 street delivery blocks",
      "900211 = Central Business District immediately north of Garki",
    ],
    faqExtra: {
      q: "What is the difference between 900001 and 900241 in Garki?",
      a: "900001 is the General Post Office head-office code for Abuja; 900241 (and 900242–900247) identify specific residential/commercial Garki Areas for street courier sorting.",
    },
    crossLinks: [{ label: "Abuja Municipal Area Council (/geo/fct-abuja/abuja)", href: "/geo/fct-abuja/abuja" }],
  },
  "fct-abuja:wuse": {
    intro:
      "Wuse is Abuja’s busiest retail and office district — Wuse Market, Herbert Macaulay Way and Zones 1–7 step sequentially from 900281 to 900287, while adjoining Wuse II uses 900288.",
    bullets: [
      "900281 = Wuse Zone 1 (Wuse Market & central plazas)",
      "900282–900287 = Wuse Zones 2 through 7 sequential delivery blocks",
      "900288 = Wuse II (Aminu Kano Crescent, Adetokunbo Ademola & Banex)",
    ],
    faqExtra: {
      q: "Does Wuse II use the same postal code as Wuse Zone 2?",
      a: "Detailed Abuja street compilations assign 900282 to Wuse Zone 2 and 900288 to Wuse II, though summary tables occasionally group all of Wuse under 900281.",
    },
    crossLinks: [{ label: "Abuja Municipal Area Council (/geo/fct-abuja/abuja)", href: "/geo/fct-abuja/abuja" }],
  },
  "fct-abuja:maitama": {
    intro:
      "Maitama is Abuja’s premier diplomatic and residential Phase 1 district — Aguiyi Ironsi Street, IBB Way, Ministers Hill and Transcorp Hilton share the district-wide code 900271.",
    bullets: [
      "900271 = Entire Maitama district (embassies, high commissions & residences)",
      "900288 = Adjacent Wuse II south-west of Maitama",
      "900231 = Asokoro across the Three Arms / Central Area axis",
    ],
    faqExtra: {
      q: "Do different streets in Maitama use different postal codes?",
      a: "Public NIPOST directories assign a single code — 900271 — across Maitama Phase 1, unlike Wuse and Garki which split by numbered zones/areas.",
    },
    crossLinks: [{ label: "Abuja Municipal Area Council (/geo/fct-abuja/abuja)", href: "/geo/fct-abuja/abuja" }],
  },
  "fct-abuja:asokoro": {
    intro:
      "Asokoro sits on the eastern flank of Abuja Phase 1 beside Aso Rock — ECOWAS Secretariat, state governors’ lodges and diplomatic residences route under 900231.",
    bullets: [
      "900231 = Asokoro main district",
      "900104 = Guzape / Asokoro Extension hillside layouts to the south",
      "900221 = Three Arms Zone & Villa precinct immediately north-west",
    ],
    faqExtra: {
      q: "What code covers Guzape and Asokoro Extension?",
      a: "Core Asokoro uses 900231, while Guzape District to the south appears as 900104 in Abuja property and postal compilations.",
    },
    crossLinks: [{ label: "Abuja Municipal Area Council (/geo/fct-abuja/abuja)", href: "/geo/fct-abuja/abuja" }],
  },
  "fct-abuja:gwarinpa": {
    intro:
      "Gwarinpa houses West Africa’s largest single planned residential estate along the Kubwa Expressway — 1st through 7th Avenues share 900108 with neighbouring Jabi, Utako and Life Camp.",
    bullets: [
      "900108 = Gwarinpa Estate, Life Camp, Kado, Jabi & Utako western AMAC belt",
      "901101 = Kubwa further north-west inside Bwari Area Council",
      "900107 = Lugbe & Airport Road corridor to the south-west",
    ],
    faqExtra: {
      q: "Why do Gwarinpa and Jabi share 900108?",
      a: "NIPOST’s western Abuja Municipal suburban dispatch groups Gwarinpa, Life Camp, Kado, Jabi and Utako under 900108 — always include your Gwarinpa Avenue/Road number so couriers sort accurately.",
    },
    crossLinks: [
      { label: "Abuja Municipal Area Council (/geo/fct-abuja/abuja)", href: "/geo/fct-abuja/abuja" },
      { label: "Nnamdi Azikiwe Int’l Airport (ABV)", href: "/airports/abuja-nnamdi-azikiwe" },
    ],
  },
  "fct-abuja:central-business-district": {
    intro:
      "Abuja’s Central Business District (CBD / Central Area) concentrates federal ministries, the Central Bank of Nigeria headquarters, NNPC Towers, National Mosque and National Christian Centre under 900211.",
    bullets: [
      "900211 = Central Business District (Federal Secretariat, CBN HQ, NNPC Towers)",
      "900221 = Adjoining Three Arms Zone (National Assembly & Supreme Court)",
      "900001 = Abuja GPO counter in neighbouring Garki",
    ],
    faqExtra: {
      q: "Is Abuja Central Area 900001 or 900211?",
      a: "Street deliveries to ministries, banks and corporate towers in Central Area use 900211, though some national summary tables list 900001 (the Garki GPO code) as a catch-all.",
    },
    crossLinks: [
      { label: "Abuja Municipal Area Council (/geo/fct-abuja/abuja)", href: "/geo/fct-abuja/abuja" },
      { label: "CBN & bank headquarters (/codes/banks)", href: "/codes/banks" },
      { label: "NNPC Limited profile (/oil-gas/nnpc-limited)", href: "/oil-gas/nnpc-limited" },
    ],
  },
  "fct-abuja:kubwa": {
    intro:
      "Kubwa is Abuja’s largest commuter satellite town along the Zuba–Kubwa Expressway inside Bwari Area Council — Phases 2, 3, 4, Arab Road and Byazhin use 901101 rather than AMAC’s 900xxx codes.",
    bullets: [
      "901101 = Kubwa satellite town (Phases 2–4,PW, Arab Road & NYSC camp axis)",
      "901001 = Bwari Area Council headquarters & Nigerian Law School Bwari campus",
      "900108 = Gwarinpa before crossing from AMAC into Bwari Area Council",
    ],
    faqExtra: {
      q: "Why does Kubwa start with 901 instead of 900?",
      a: "Kubwa sits administratively inside Bwari Area Council (901xxx dispatch) rather than Abuja Municipal Area Council (900xxx).",
    },
    crossLinks: [{ label: "Bwari Area Council (/geo/fct-abuja/bwari)", href: "/geo/fct-abuja/bwari" }],
  },
  "rivers:port-harcourt": {
    intro:
      "Port Harcourt’s New GRA and Trans-Amadi industrial layout carry 500272, distinct from the 500001 Port Harcourt GPO counter, 500101 Old GRA/Diobu, and 500102 Obio-Akpor.",
    bullets: [
      "500272 = Port Harcourt GRA & Trans-Amadi industrial/oilfield service belt",
      "500101 = Port Harcourt City (Old GRA, D-Line, Town & Diobu)",
      "500102 = Obio-Akpor (Rumuola, Rumuokoro, Woji & Choba UNIPORT axis)",
    ],
    faqExtra: {
      q: "What is the difference between 500001, 500101 and 500272 in Port Harcourt?",
      a: "500001 is the Port Harcourt General Post Office; 500101 covers older Port Harcourt City districts (Town, Diobu, D-Line); 500272 covers GRA/Trans-Amadi urban layouts.",
    },
    crossLinks: [
      { label: "Port Harcourt LGA (/geo/rivers/port-harcourt)", href: "/geo/rivers/port-harcourt" },
      { label: "Rivers Port Complex (NGPHC)", href: "/ports/rivers-port-port-harcourt" },
      { label: "Port Harcourt Int’l Airport (PHC)", href: "/airports/port-harcourt-international" },
    ],
  },
  "kano:kano-municipal": {
    intro:
      "Kano Municipal anchors the historic walled city around Emir’s Palace (Gidan Rumfa) and Kurmi Market on 700101/700211, distinct from Fagge’s Kantin Kwari market belt (700202) and Kano GPO (700001).",
    bullets: [
      "700101 = Kano Municipal metropolitan delivery (700211 also cited on urban street tables)",
      "700202 = Fagge LGA — Kantin Kwari textile market & Sabon Gari Kano",
      "700103–700104 = Adjacent Gwale (BUK Old Site) & Nassarawa GRA",
    ],
    faqExtra: {
      q: "Should traders in Kantin Kwari or Sabon Gari use 700101?",
      a: "Kantin Kwari and Sabon Gari sit in Fagge LGA (700202), whereas Kano Municipal inside the old city walls uses 700101 (with 700001 as Kano GPO).",
    },
    crossLinks: [
      { label: "Kano Municipal LGA (/geo/kano/kano-municipal)", href: "/geo/kano/kano-municipal" },
      { label: "Mallam Aminu Kano Int’l Airport (KAN)", href: "/airports/kano-mallam-aminu-kano" },
    ],
  },
  "abia:aba": {
    intro:
      "Aba (Enyimba City) is South-East Nigeria’s manufacturing, leatherwork and textile powerhouse — Aba North and the Ariaria International Market belt use the 450 dispatch block (450101), completely separate from Umuahia’s 440001 state capital code.",
    bullets: [
      "450101 = Aba North (Ariaria, Ogbor Hill & Osusu urban range 450101–450272; Aba GPO 450001)",
      "450103 = Aba South (Asa Road, Eziukwu & Cemetery Market trading core 450103–450104)",
      "440001 = Umuahia GPO — 60 km north, do not enter for Aba street deliveries",
    ],
    faqExtra: {
      q: "Why shouldn’t Aba businesses use Abia State’s 440001 code?",
      a: "NIPOST gave Aba its own 3-digit sorting centre (450) separate from Umuahia (440). Using 450101 (Aba North / Ariaria) or 450103 (Aba South) routes parcels directly to Aba.",
    },
    crossLinks: [
      { label: "Aba North LGA (/geo/abia/aba-north)", href: "/geo/abia/aba-north" },
      { label: "Aba South LGA (/geo/abia/aba-south)", href: "/geo/abia/aba-south" },
    ],
  },
  "anambra:onitsha": {
    intro:
      "Onitsha sits on the eastern bank of the River Niger and hosts one of West Africa’s largest markets — NIPOST routes Onitsha through its dedicated 430 dispatch centre (430001 GPO, 430101–430283 urban layouts) rather than Awka’s 420001 capital code.",
    bullets: [
      "430001 = Onitsha GPO & Onitsha North commercial core (Main Market, GRA, Inland Town 430001–430282)",
      "430212 = Onitsha South (Fegge, Bridgehead & Ochanja Market 430212–430283)",
      "435001 = Nnewi industrial hub (435101 urban) to the south-east",
    ],
    faqExtra: {
      q: "Is Onitsha 420001 or 430001?",
      a: "420001 is Awka (the state capital). Onitsha has its own 430 dispatch prefix — enter 430001 for Onitsha North/Main Market or 430212 for Fegge/Onitsha South.",
    },
    crossLinks: [
      { label: "Onitsha North LGA (/geo/anambra/onitsha-north)", href: "/geo/anambra/onitsha-north" },
      { label: "Onitsha South LGA (/geo/anambra/onitsha-south)", href: "/geo/anambra/onitsha-south" },
      { label: "Chinua Achebe Airport Umueri (ANA)", href: "/airports/anambra-chinua-achebe" },
    ],
  },
};

export function getPostalAreaExtras(stateSlug: string, areaSlug: string): PostalAreaExtra | null {
  return POSTAL_AREA_EXTRAS[`${stateSlug}:${areaSlug}`] ?? null;
}
