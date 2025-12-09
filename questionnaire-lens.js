let pvData = pv;
let htmlData = html;

let epiData = epi;
let ipsData = ips;
let lang = "";  // Default language, will be set by ePI

// --- Language dictionary for user-facing messages ---
const languageDict = {
    en: {
        bannerWarning: "⚠️ This medication may cause high-risk side effects.",
        questionnaireLink: "Fill out safety questionnaire",
        fillQuestionnaire: "📝 Fill out safety questionnaire"
    },
    es: {
        bannerWarning: "⚠️ Este medicamento puede causar efectos secundarios de alto riesgo.",
        questionnaireLink: "Rellenar cuestionario de seguridad",
        fillQuestionnaire: "📝 Rellenar cuestionario de seguridad"
    },
    pt: {
        bannerWarning: "⚠️ Este medicamento pode causar efeitos secundários de alto risco.",
        questionnaireLink: "Preencher questionário de segurança",
        fillQuestionnaire: "📝 Preencher questionário de segurança"
    },
    da: {
        bannerWarning: "⚠️ Denne medicin kan forårsage alvorlige bivirkninger.",
        questionnaireLink: "Udfyld sikkerhedsspørgeskema",
        fillQuestionnaire: "📝 Udfyld sikkerhedsspørgeskema"
    }
};

let getSpecification = () => {
    return "2.0.3-questionnaire-banner";
};

// --- Utility: Get language key from detected language ---
const getLangKey = (language) => {
    if (language?.startsWith("pt")) return "pt";
    if (language?.startsWith("es")) return "es";
    if (language?.startsWith("da")) return "da";
    return "en"; // Default to English
};

//document, htmlData, bannerHTML
//
const insertQuestionnaireLink = (listOfCategories, language, document, response) => {
    const langKey = getLangKey(language);
    const messages = languageDict[langKey];
    const linkHTML = "https://example.org/questionnaire/high-risk";
    let shouldAppend = false; //for future usage
    let foundCategory = false;
    console.log(listOfCategories)
    console.log(listOfCategories.length)
    listOfCategories.forEach((className) => {
        if (
            response.includes(`class="${className}`) ||
            response.includes(`class='${className}`)
        ) {
            const elements = document.getElementsByClassName(className);
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                const link = document.createElement("a");
                link.setAttribute("href", linkHTML);
                link.setAttribute("target", "_blank");
                link.setAttribute("class", "questionnaire-lens");

                if (shouldAppend) {
                    // Append the link as a new element inside the existing element
                    link.innerHTML = messages.fillQuestionnaire;
                    el.appendChild(link);
                } else {
                    // Wrap the existing contents of the element in the link
                    link.innerHTML = el.innerHTML;
                    el.innerHTML = "";
                    el.appendChild(link);
                }
            }
            foundCategory = true;
        }
    });

    // No matching category tags → inject banner at top
    if (!foundCategory) {
        const bannerDiv = document.createElement("div");
        bannerDiv.innerHTML = `
            <div class="alert-banner questionnaire-lens" style="background-color:#ffdddd;padding:1em;border:1px solid #ff8888;margin-bottom:1em;">
                ${messages.bannerWarning}
                <a href="${linkHTML}" target="_blank" style="margin-left: 1em;">${messages.questionnaireLink}</a>
            </div>
        `;

        const body = document.querySelector("body");
        if (body) {
            body.insertBefore(bannerDiv, body.firstChild);
        }
    }

    // Clean head (same as your original logic)
    if (document.getElementsByTagName("head").length > 0) {
        document.getElementsByTagName("head")[0].remove();
    }

    // Extract HTML result
    if (document.getElementsByTagName("body").length > 0) {
        response = document.getElementsByTagName("body")[0].innerHTML;
        console.log("Response: " + response);
    } else {
        console.log("Response: " + document.documentElement.innerHTML);
        response = document.documentElement.innerHTML;
    }

    if (!response || response.trim() === "") {
        throw new Error("Annotation process failed: empty or null response");
    }

    return response;
};

let enhance = async () => {

    if (!epiData || !epiData.entry || epiData.entry.length === 0) {
        throw new Error("ePI is empty or invalid.");
    }
    let listOfCategoriesToSearch = ["grav-3"]; //what to look in extensions -made up code because there is none

    // Match lists
    const BUNDLE_IDENTIFIER_LIST = ["epibundle-123", "epibundle-abc"];
    const PRODUCT_IDENTIFIER_LIST = ["CIT-204447", "RIS-197361"];


    let matchFound = false;

    // 1. Check Composition.language
    epiData.entry?.forEach((entry) => {
        const res = entry.resource;
        if (res?.resourceType === "Composition" && res.language) {
            lang = res.language;
            console.log("🌍 Detected from Composition.language:", lang);
        }
    });

    // 2. If not found, check Bundle.language
    if (!lang && epiData.language) {
        lang = epiData.language;
        console.log("🌍 Detected from Bundle.language:", lang);
    }

    // 3. Fallback message
    if (!lang) {
        console.warn("⚠️ No language detected in Composition or Bundle.");
    }

    // Check bundle.identifier.value
    if (
        epiData.identifier &&
        BUNDLE_IDENTIFIER_LIST.includes(epiData.identifier.value)
    ) {
        console.log("🔗 Matched ePI Bundle.identifier:", epiData.identifier.value);
        matchFound = true;
    }

    // Check MedicinalProductDefinition.identifier.value
    epiData.entry.forEach((entry) => {
        const res = entry.resource;
        if (res?.resourceType === "MedicinalProductDefinition") {
            const ids = res.identifier || [];
            ids.forEach((id) => {
                if (PRODUCT_IDENTIFIER_LIST.includes(id.value)) {
                    console.log("💊 Matched MedicinalProductDefinition.identifier:", id.value);
                    matchFound = true;
                }
            });
        }
    });

    // ePI traslation from terminology codes to their human redable translations in the sections
    // in this case, if is does not find a place, adds it to the top of the ePI
    let compositions = 0;
    let categories = [];
    epi.entry.forEach((entry) => {
        if (entry.resource.resourceType == "Composition") {
            compositions++;
            //Iterated through the Condition element searching for conditions
            entry.resource.extension.forEach((element) => {

                // Check if the position of the extension[1] is correct
                if (element.extension[1].url == "concept") {
                    // Search through the different terminologies that may be avaible to check in the condition
                    if (element.extension[1].valueCodeableReference.concept != undefined) {
                        element.extension[1].valueCodeableReference.concept.coding.forEach(
                            (coding) => {
                                console.log("Extension: " + element.extension[0].valueString + ":" + coding.code)
                                // Check if the code is in the list of categories to search
                                if (listOfCategoriesToSearch.includes(coding.code)) {
                                    // Check if the category is already in the list of categories
                                    categories.push(element.extension[0].valueString);
                                }
                            }
                        );
                    }
                }
            });
        }
    });
    if (compositions == 0) {
        throw new Error('Bad ePI: no category "Composition" found');
    }

    if (!matchFound) {
        console.log("ePI is not for a high-risk side effect medication");
        return htmlData;
    }

    else {


        let response = htmlData;
        let document;

        if (typeof window === "undefined") {
            let jsdom = await import("jsdom");
            let { JSDOM } = jsdom;
            let dom = new JSDOM(htmlData);
            document = dom.window.document;
            return insertQuestionnaireLink(categories, lang, document, response);
            //listOfCategories, enhanceTag, document, response
        } else {
            document = window.document;
            return insertQuestionnaireLink(categories, lang, document, response);
        }
    };
};


function getReport(lang) {
    console.log("Generating report in language:", lang);
    return { message: getExplanation(lang), status: "" };


}

let explanation = () => {
    // Extract language from ePI
    let language = "en"; // default to English
    if (epiData && epiData.language) {
        language = epiData.language.toLowerCase();
    }

    // Explanations in different languages
    const explanations = {
        en: "This lens identifies high-risk medications that may cause serious side effects. When a match is found based on the product or bundle identifier, it adds a link to a safety questionnaire. The link is placed in specific sections of the document when available (e.g., sections with relevant risk categories), or displayed as a warning banner at the top of the document if no specific section is found. This helps patients complete important safety assessments before using the medication.",
        es: "Esta lente identifica medicamentos de alto riesgo que pueden causar efectos secundarios graves. Cuando se encuentra una coincidencia basada en el identificador del producto o del paquete, añade un enlace a un cuestionario de seguridad. El enlace se coloca en secciones específicas del documento cuando están disponibles (por ejemplo, secciones con categorías de riesgo relevantes), o se muestra como un banner de advertencia en la parte superior del documento si no se encuentra ninguna sección específica. Esto ayuda a los pacientes a completar evaluaciones de seguridad importantes antes de usar el medicamento.",
        fr: "Cette lentille identifie les médicaments à haut risque pouvant provoquer des effets secondaires graves. Lorsqu'une correspondance est trouvée sur la base de l'identifiant du produit ou du bundle, elle ajoute un lien vers un questionnaire de sécurité. Le lien est placé dans des sections spécifiques du document lorsqu'elles sont disponibles (par exemple, des sections avec des catégories de risque pertinentes), ou affiché comme une bannière d'avertissement en haut du document si aucune section spécifique n'est trouvée. Cela aide les patients à effectuer des évaluations de sécurité importantes avant d'utiliser le médicament.",
        de: "Diese Linse identifiziert Hochrisikomedikamente, die schwerwiegende Nebenwirkungen verursachen können. Wenn eine Übereinstimmung basierend auf der Produkt- oder Bundle-Kennung gefunden wird, fügt sie einen Link zu einem Sicherheitsfragebogen hinzu. Der Link wird in bestimmten Abschnitten des Dokuments platziert, wenn verfügbar (z. B. Abschnitte mit relevanten Risikokategorien), oder als Warnbanner oben im Dokument angezeigt, wenn kein bestimmter Abschnitt gefunden wird. Dies hilft Patienten, wichtige Sicherheitsbewertungen vor der Verwendung des Medikaments durchzuführen.",
        it: "Questa lente identifica i farmaci ad alto rischio che possono causare gravi effetti collaterali. Quando viene trovata una corrispondenza basata sull'identificatore del prodotto o del bundle, aggiunge un collegamento a un questionario di sicurezza. Il collegamento viene inserito in sezioni specifiche del documento quando disponibili (ad esempio, sezioni con categorie di rischio pertinenti), oppure visualizzato come banner di avviso nella parte superiore del documento se non viene trovata alcuna sezione specifica. Questo aiuta i pazienti a completare valutazioni di sicurezza importanti prima di utilizzare il farmaco.",
        pt: "Esta lente identifica medicamentos de alto risco que podem causar efeitos colaterais graves. Quando uma correspondência é encontrada com base no identificador do produto ou do pacote, adiciona um link para um questionário de segurança. O link é colocado em seções específicas do documento quando disponíveis (por exemplo, seções com categorias de risco relevantes), ou exibido como um banner de aviso no topo do documento se nenhuma seção específica for encontrada. Isso ajuda os pacientes a concluir avaliações de segurança importantes antes de usar o medicamento.",
        nl: "Deze lens identificeert geneesmiddelen met een hoog risico die ernstige bijwerkingen kunnen veroorzaken. Wanneer een overeenkomst wordt gevonden op basis van het product- of bundle-identificatienummer, voegt het een link toe naar een veiligheidsvragenlijst. De link wordt in specifieke secties van het document geplaatst wanneer deze beschikbaar zijn (bijv. secties met relevante risicocategorieën), of weergegeven als een waarschuwingsbanner bovenaan het document als er geen specifieke sectie wordt gevonden. Dit helpt patiënten belangrijke veiligheidsbeoordelingen uit te voeren voordat ze het medicijn gebruiken."
    };

    // Return explanation in the ePI language, default to English if not found
    return explanations[language] || explanations.en;
};

return {
    enhance: enhance,
    getSpecification: getSpecification,
    explanation: (language) => getExplanation(language || lang),
    report: (language) => getReport(language || lang),
};


