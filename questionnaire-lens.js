let pvData = pv;
let htmlData = html;

let epiData = epi;
let ipsData = ips;

let getSpecification = () => {
    return "2.0.3-questionnaire-banner";
};
//document, htmlData, bannerHTML
//
const insertQuestionnaireLink = (listOfCategories, language, document, response) => {

    if (language?.startsWith("pt")) {
        linkHTML = "https://example.org/questionnaire/high-risk";

    } else if (language?.startsWith("en")) {
        linkHTML = "https://example.org/questionnaire/high-risk";

    } else if (language?.startsWith("es")) {
        linkHTML = "https://example.org/questionnaire/high-risk";

    } else if (language?.startsWith("da")) {
        linkHTML = "https://example.org/questionnaire/high-risk";

    } else {
        linkHTML = "https://example.org/questionnaire/high-risk";

    }
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
                    link.innerHTML = "📝 Fill out safety questionnaire";
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

        if (language?.startsWith("pt")) {
            bannerDiv.innerHTML = `
       <div class="alert-banner questionnaire-lens" style="background-color:#ffdddd;padding:1em;border:1px solid #ff8888;margin-bottom:1em;">
  ⚠️ Este medicamento pode causar efeitos secundários de alto risco.
  <a href="${linkHTML}" target="_blank" style="margin-left: 1em;">Preencher questionário de segurança</a>
</div>
      `;

        } else if (language?.startsWith("en")) {
            bannerDiv.innerHTML = `
        <div class="alert-banner questionnaire-lens" style="background-color:#ffdddd;padding:1em;border:1px solid #ff8888;margin-bottom:1em;">
          ⚠️ This medication may cause high-risk side effects.
          <a href="${linkHTML}" target="_blank" style="margin-left: 1em;">Fill out safety questionnaire</a>
        </div>
      `;

        } else if (language?.startsWith("es")) {
            bannerDiv.innerHTML = `
       <div class="alert-banner questionnaire-lens" style="background-color:#ffdddd;padding:1em;border:1px solid #ff8888;margin-bottom:1em;">
  ⚠️ Este medicamento puede causar efectos secundarios de alto riesgo.
  <a href="${linkHTML}" target="_blank" style="margin-left: 1em;">Rellenar cuestionario de seguridad</a>
</div>
      `;
        } else if (language?.startsWith("da")) {
            bannerDiv.innerHTML = `
      <div class="alert-banner questionnaire-lens" style="background-color:#ffdddd;padding:1em;border:1px solid #ff8888;margin-bottom:1em;">
  ⚠️ Denne medicin kan forårsage alvorlige bivirkninger.
  <a href="${linkHTML}" target="_blank" style="margin-left: 1em;">Udfyld sikkerhedsspørgeskema</a>
</div>
      `;
        } else {
            bannerDiv.innerHTML = `
        <div class="alert-banner questionnaire-lens" style="background-color:#ffdddd;padding:1em;border:1px solid #ff8888;margin-bottom:1em;">
          ⚠️ This medication may cause high-risk side effects.
          <a href="${linkHTML}" target="_blank" style="margin-left: 1em;">Fill out safety questionnaire</a>
        </div>
      `;

        }



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
    let languageDetected = null;

    // 1. Check Composition.language
    epiData.entry?.forEach((entry) => {
        const res = entry.resource;
        if (res?.resourceType === "Composition" && res.language) {
            languageDetected = res.language;
            console.log("🌍 Detected from Composition.language:", languageDetected);
        }
    });

    // 2. If not found, check Bundle.language
    if (!languageDetected && epiData.language) {
        languageDetected = epiData.language;
        console.log("🌍 Detected from Bundle.language:", languageDetected);
    }

    // 3. Fallback message
    if (!languageDetected) {
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
            return insertQuestionnaireLink(categories, languageDetected, document, response);
            //listOfCategories, enhanceTag, document, response
        } else {
            document = window.document;
            return insertQuestionnaireLink(categories, languageDetected, document, response);
        }
    };
};

return {
    enhance: enhance,
    getSpecification: getSpecification,
};
