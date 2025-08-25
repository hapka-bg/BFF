document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("addProductForm");
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("fileInput");
    const preview = document.getElementById("preview");
    const previewImage = document.getElementById("previewImage");
    const dropText = dropZone.querySelector("span");

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

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        // Collect form data
        const productData = {
            name: form.name.value,
            description: form.description.value,
            price: parseFloat(form.price.value),
            image: previewImage.src
        };

        // TODO: Replace this with actual backend request
        console.log("Submitting product:", productData);

        showSnackbar("Product added successfully");

        setTimeout(() => {
            window.location.href = "admin-dashboard.html#products";
        }, 1500);
    });

    function showSnackbar(message) {
        const snackbar = document.getElementById("snackbar");
        snackbar.textContent = message;
        snackbar.classList.add("show");
        setTimeout(() => snackbar.classList.remove("show"), 3000);
    }
});

function goBack() {
    window.location.href = "admin.html";
}
