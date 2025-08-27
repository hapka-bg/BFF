import {apiFetch} from "./jwtFetch.js";

document.addEventListener("DOMContentLoaded", async function () {
    const $ = id => document.getElementById(id);

    const cache = { products: [], ingredients: [] };

    async function loadData() {
        try {
            const [prodRes, ingRes] = await Promise.all([
                apiFetch("http://localhost:8083/api/v1/products/all"),
                apiFetch("http://localhost:8083/api/v1/ingredients/all")
            ]);
            if (!prodRes.ok || !ingRes.ok) throw new Error("Failed to fetch data");
            cache.products = await prodRes.json();
            cache.ingredients = await ingRes.json();
        } catch (err) {
            console.error(err);
            alert("Failed to load products/ingredients from server.");
        }
    }

    await loadData();

    const searchInput = $('productSearch');
    const productList = $('productList');
    const selectedProducts = $('selectedProducts');
    const selectElement = $('combinableProducts');
    const form = $('addProductForm');
    const dropZone = $('drop-zone');
    const fileInput = $('fileInput');
    const preview = $('preview');
    const previewImage = $('previewImage');
    const dropText = dropZone.querySelector("span");
    const suggestionsBox = $('ingredientSuggestions');
    const selectedList = $('selectedIngredientsList');
    const input = $('ingredients');

    let selectedIngredients = [];

    [...selectElement.options].forEach(o => o.selected = false);
    selectedProducts.innerHTML = '';


    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('hover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('hover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

    function handleFiles(files) {
        const file = files[0];
        if (!file || !file.type.startsWith('image/')) {
            alert("Please upload a valid image file.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            preview.style.display = 'block';
            dropText.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    input.addEventListener("input", () => {
        const matches = cache.ingredients.filter(
            ing => ing.name.toLowerCase().includes(input.value.toLowerCase()) &&
                !selectedIngredients.some(sel => sel.id === ing.id)
        );
        renderMatches(matches, suggestionsBox, ing => {
            addIngredient(ing);
            input.value = '';
            suggestionsBox.style.display = 'none';
        });
    });

    function addIngredient(ing) {
        selectedIngredients.push({
            id: ing.id,
            name: ing.name,
            permanent: false,
            canBeAdded: true,
            canBeRemoved: true,
            extraCost: 0,
            maxQty: 1
        });
        renderSelected();
    }



    function removeIngredient(id) {
        selectedIngredients = selectedIngredients.filter(ing => ing.id !== id);
        renderSelected();
    }

    function renderSelected() {
        selectedList.innerHTML = '';

        const openStates = {};
        selectedList.querySelectorAll(".ingredient-settings").forEach((el, i) => {
            openStates[selectedIngredients[i].id] = el.style.display === "block";
        });

        selectedIngredients.forEach(ing => {
            const nameEl = el("span", { textContent: ing.name, style: "cursor:pointer" });
            const removeBtn = el("button", {
                className: "remove-btn",
                innerHTML: "&times;",
                onclick: () => removeIngredient(ing.id)
            });
            const header = el("div", { className: "ingredient-header" }, nameEl, removeBtn);

            const settings = el("div", { className: "ingredient-settings", style: `display:${openStates[ing.id] ? "block" : "none"}` });

            const permanentToggle = makeToggle("Permanent", ing, "permanent", () => {
                if (ing.permanent) {
                    ing.canBeAdded = false;
                    ing.canBeRemoved = false;
                    ing.extraCost = 0;
                    ing.maxQty = 1;
                    selectedIngredients.forEach(otherIng => {
                        if (otherIng.id !== ing.id) {
                            otherIng.canBeAdded = false;
                            otherIng.canBeRemoved = false;
                            otherIng.extraCost = 0;
                            otherIng.maxQty = 1;
                            otherIng.permanent = false;
                        }
                    });
                }
                renderSelected();
            });
            settings.append(permanentToggle);

            const canAddToggle = makeToggle("Can be added", ing, "canBeAdded");
            const canRemoveToggle = makeToggle("Can be removed", ing, "canBeRemoved");
            const extraCostInput = makeNumber("Extra cost", ing, "extraCost", 0.01);
            const maxQtyInput = makeNumber("Max qty", ing, "maxQty", 1);

            if (ing.permanent) {
                [canAddToggle, canRemoveToggle, extraCostInput, maxQtyInput].forEach(wrapper => {
                    const input = wrapper.querySelector("input");
                    if (input) input.disabled = true;
                });
            }

            settings.append(canAddToggle, canRemoveToggle, extraCostInput, maxQtyInput);

            nameEl.onclick = () => {
                settings.style.display = settings.style.display === "none" ? "block" : "none";
            };

            selectedList.append(el("div", { className: "ingredient-card" }, header, settings));
        });
    }

    searchInput.addEventListener('input', e => {
        const matches = cache.products.filter(
            p => p.name.toLowerCase().includes(e.target.value.toLowerCase()) &&
                ![...selectElement.selectedOptions].some(o => o.value == p.id)
        );
        renderMatches(matches, productList, p => addTag(p));
    });
    document.addEventListener('click', (e) => {

        if (!e.target.closest('#productSearch') && !e.target.closest('#productList')) {
            productList.style.display = 'none';
        }

        if (!e.target.closest('#ingredients') && !e.target.closest('#ingredientSuggestions')) {
            suggestionsBox.style.display = 'none';
        }
    });


    function addTag(product) {
        if ([...selectElement.selectedOptions].some(o => o.value == product.id)) return;
        let opt = [...selectElement.options].find(o => o.value == product.id);
        if (!opt) {
            opt = new Option(product.name, product.id, true, true); // text, value, defaultSelected, selected
            selectElement.add(opt);
        }
        else {
            opt.selected = true;
        }

        const tag = el("div", { className: "tag" },
            el("span", { textContent: product.name }),
            el("button", {
                type: "button",
                className: "remove-btn",
                innerHTML: "&times;",
                onclick: () => {
                    tag.remove();
                    if (opt) opt.selected = false;
                    renderMatches(cache.products, productList, addTag);
                }
            })
        );
        selectedProducts.append(tag);
        searchInput.value = '';
        productList.innerHTML = '';
        productList.style.display = 'none';
    }
    function getProductData() {
        return {
            name: form.name.value.trim(),
            description: form.description.value.trim(),
            price: parseFloat(form.price.value) || 0,
            grams: parseInt(form.grams.value) || 0,
            seasonal: form.seasonal.checked,
            category: form.category.value.toUpperCase(),
            recipe: form.recipe.value.trim(),
            ingredients: selectedIngredients.map(i => ({
                id: i.id,
                permanent: i.permanent,
                canBeAdded: i.canBeAdded,
                canBeRemoved: i.canBeRemoved,
                extraCost: i.extraCost,
                maxQty: i.maxQty
            })),
            combinableProducts: [...selectElement.selectedOptions].map(o => o.value),
            image: previewImage.src || null
        };
    }
    async function postProduct(productData) {
        const res = await apiFetch("http://localhost:8083/api/v1/products/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Server error: ${res.status} ${errorText}`);
        }

        return res.json();
    }
    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        try {
            const productData = getProductData();
            await postProduct(productData);

            showSnackbar("Product added successfully");

            setTimeout(() => {
                window.location.href = "admin.html";
            }, 1500);

        } catch (err) {
            console.error("Failed to add product:", err);
            alert("Failed to add product. Please try again.");
        }
    });

    function showSnackbar(message) {
        const snackbar = $("snackbar");
        snackbar.textContent = message;
        snackbar.classList.add("show");
        setTimeout(() => snackbar.classList.remove("show"), 3000);
    }


    function renderMatches(items, container, onClick) {
        container.innerHTML = '';
        if (!items.length) return container.style.display = 'none';
        items.forEach(item => {
            const li = el("li", { textContent: item.name, onclick: () => onClick(item) });
            container.append(li);
        });
        container.style.display = 'block';
    }

    function el(tag, props = {}, ...children) {
        const element = document.createElement(tag);
        Object.assign(element, props);
        children.forEach(c => element.append(c));
        return element;
    }

    function makeToggle(label, obj, key, onChange) {
        const cb = el("input", {
            type: "checkbox",
            checked: obj[key],
            onchange: e => {
                obj[key] = e.target.checked;
                if (typeof onChange === "function") {
                    onChange(e);
                }
            }
        });
        return el("label", {},
            el("span", { textContent: label }),
            el("label", { className: "toggle-switch" }, cb, el("span", { className: "slider" }))
        );
    }


    function makeNumber(label, obj, key, step) {
        const inp = el("input", { type: "number", step, value: obj[key], onchange: e => obj[key] = parseFloat(e.target.value) || 0 });
        return el("label", {}, el("span", { textContent: label }), inp);
    }
});

