// Play mode: every key press types the next letter of one of these.
// Keep to characters the typewriter knows (letters, åäö, digits, . , ! ? - : ').
export const PLAY_MODES = {
  author: {
    label: "Författare",
    hint: "Sagor och dikter",
    texts: [
      "Det var en gång en giraff som hette Gurkan. Gurkan bodde i en tekanna mitt i skogen. Varje morgon åt han tre pannkakor och en sko.\n\nEn dag kom en snigel på cykel och sa: Hej Gurkan! Vill du följa med till månen?\n\nGurkan sa ja, men först måste han borsta alla sina fläckar. Sedan flög de iväg på en stor gul ost.\n\nSLUT.",
      "KAPITEL 1\n\nPrinsessan Knorr hade en krona gjord av spagetti. Hennes bästa vän var en drake som var rädd för fjärilar.\n\nTillsammans byggde de ett slott av kuddar och glass. Men oj! Solen kom fram och slottet smälte.\n\nDå skrattade draken så mycket att han nös regnbågar.\n\nKAPITEL 2\n\nAlla fick ha galoscher.",
      "DIKT OM EN KORV\n\nEn korv gick ut en dag i maj,\nhan sa till solen: Hej hej hej!\n\nHan mötte en ko med hatt av bröd,\nhon spelade trumpet och var röd.\n\nDe dansade vals på en blå banan,\noch sen tog de bussen hem till stan.",
    ],
  },
  work: {
    label: "Jobb",
    hint: "Möten och listor",
    texts: [
      "ANTECKNINGAR FRÅN MÖTET\n\nNärvarande: Chefen, en katt och tre tomater.\n\nPunkt 1: Kaffet är slut. Katten har druckit allt.\n\nPunkt 2: Alla papper ska vara rosa från och med tisdag.\n\nPunkt 3: Tomaterna vill ha semester.\n\nBeslut: Vi äter kakor och går hem.",
      "ATT GÖRA IDAG:\n\n- Ringa till månen\n- Köpa 400 gem\n- Mata datorn med russin\n- Vattna chefen\n- Sortera alla bokstäver\n- Ta en tupplur under skrivbordet\n\nKlart! Bra jobbat!",
      "RAPPORT OM FREDAGAR\n\nVi har undersökt fredagar i tre veckor. Resultatet är tydligt: fredagar är bäst.\n\nOnsdagar är lite konstiga och måndagar luktar sur gröt.\n\nDärför föreslår vi att alla dagar ska heta fredag.\n\nSkriven av Doktor Mus och hennes assistent, en stor kanelbulle.",
    ],
  },
  research: {
    label: "Forskare",
    hint: "Vulkanforskarens anteckningar",
    texts: [
      "FÄLTANTECKNINGAR\nPlats: Island\n\nIdag undersökte jag ett lavafält. Lavan hade stelnat och var svart och full av små hål. Hålen kommer från gasbubblor som fastnade när lavan svalnade.\n\nJag mätte marken med en GPS. Marken har höjt sig lite sedan förra mätningen. Det kan betyda att magma samlas under jorden.\n\nNästa steg: Mäta igen imorgon och jämföra.",
      "RAPPORT: VAD ÄR EN VULKAN?\n\nDjupt under marken är det så varmt att sten smälter. Smält sten under jorden kallas magma. När den kommer upp till ytan kallas den lava.\n\nLava kan vara över 1000 grader varm.\n\nIsland ligger där två jordplattor glider isär, ungefär 2 centimeter varje år. Där kan magma ta sig upp. Därför finns det många vulkaner på Island.",
      "UTRUSTNING FÖR VULKANFORSKNING\n\n- Hjälm mot fallande sten\n- Gasmask mot farliga gaser\n- Seismometer som mäter jordskalv\n- GPS som mäter om marken rör sig\n- Gasmätare för svaveldioxid\n- Anteckningsbok och penna\n\nVIKTIGT: En vulkanforskare arbetar alltid tillsammans med andra och håller säkert avstånd.",
    ],
  },
  letter: {
    label: "Brev",
    hint: "Brev till någon",
    texts: [
      "Kära mormor!\n\nHär är allt bra. Idag byggde jag en raket av en toarulle och den flög nästan hela vägen till grannen.\n\nKatten har lärt sig vissla. Jag saknar dina kanelbullar och din konstiga hatt.\n\nMånga kramar från mig!\n\nPS. Glöm inte att vattna krokodilen.",
      "Hej Tomten!\n\nJag har varit jättesnäll i år. Nästan.\n\nJag önskar mig en häst som kan åka skridskor, en regnbåge i en burk och en säng gjord av glass.\n\nOm det är för mycket går det bra med en fin sten.\n\nHälsningar, din kompis\n\nPS. Renarna får gärna komma på fika.",
      "Till Drottningen\n\nHej! Jag skriver för att berätta att det bor en drake i vår tvättstuga.\n\nHan är snäll, men han äter alla strumpor. Kan du skicka en riddare? Eller en stor påse strumpor?\n\nVi bjuder på saft och bullar.\n\nMed vänliga hälsningar,\nFamiljen Pling",
    ],
  },
};
