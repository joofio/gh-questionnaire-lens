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

// State to track if questionnaire link was added
let linkAdded = false;

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
        linkAdded = false;
        return htmlData;
    }

    else {
        linkAdded = true;

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

    // Simple, patient-friendly explanations in different languages
    const explanationsAdded = {
        en: "A link to a safety questionnaire has been added to help you assess if this medication is safe for you.",
        es: "Se ha añadido un enlace a un cuestionario de seguridad para ayudarle a evaluar si este medicamento es seguro para usted.",
        fr: "Un lien vers un questionnaire de sécurité a été ajouté pour vous aider à évaluer si ce médicament est sûr pour vous.",
        de: "Ein Link zu einem Sicherheitsfragebogen wurde hinzugefügt, um Ihnen zu helfen festzustellen, ob dieses Medikament für Sie sicher ist.",
        it: "È stato aggiunto un collegamento a un questionario di sicurezza per aiutarti a valutare se questo farmaco è sicuro per te.",
        pt: "Foi adicionado um link para um questionário de segurança para ajudá-lo a avaliar se este medicamento é seguro para você.",
        nl: "Er is een link naar een veiligheidsvragenlijst toegevoegd om u te helpen beoordelen of dit medicijn veilig voor u is."
    };

    const explanationsNotAdded = {
        en: "Your profile does not match the conditions to add a questionnaire link.",
        es: "Su perfil no coincide con las condiciones para añadir un enlace al cuestionario.",
        fr: "Votre profil ne correspond pas aux conditions pour ajouter un lien vers le questionnaire.",
        de: "Ihr Profil erfüllt nicht die Bedingungen für das Hinzufügen eines Fragebogen-Links.",
        it: "Il tuo profilo non corrisponde alle condizioni per aggiungere un collegamento al questionario.",
        pt: "Seu perfil não corresponde às condições para adicionar um link para o questionário.",
        nl: "Uw profiel voldoet niet aan de voorwaarden om een vragenlijstlink toe te voegen."
    };

    // Return explanation based on whether link was added, in the ePI language
    if (linkAdded) {
        return explanationsAdded[language] || explanationsAdded.en;
    } else {
        return explanationsNotAdded[language] || explanationsNotAdded.en;
    }
};

return {
    enhance: enhance,
    getSpecification: getSpecification,
    explanation: (language) => getExplanation(language || lang),
    report: (language) => getReport(language || lang),
};


