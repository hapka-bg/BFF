let autocomplete;
window.initAutocomplete = function () {
    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById("street"),
        {
            types: ["address"],
            componentRestrictions: { country: "bg" },
            fields: ["address_components", "formatted_address"],
        }
    );

    autocomplete.addListener("place_changed", fillInAddress);
};
function fillInAddress() {
    const place = autocomplete.getPlace();
    let street = "";
    let city = "";

    if (!place.address_components) return;

    for (const component of place.address_components) {
        const types = component.types;

        if (types.includes("route") || types.includes("street_address") || types.includes("premise")) {
            street += component.long_name + " ";
        }

        if (types.includes("locality")) {
            city = component.long_name;
        }

        // Optional: handle city in administrative_area_level_1
        if (!city && types.includes("administrative_area_level_1")) {
            city = component.long_name;
        }
    }

    document.getElementById("street").value = street.trim();
    document.getElementById("city").value = city;
}