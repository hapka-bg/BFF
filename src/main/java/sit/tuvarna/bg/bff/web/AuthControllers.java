package sit.tuvarna.bg.bff.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Map;

@Controller
public class AuthControllers {


    @Value("${turnstile.sitekey}")
    private String turnstileSiteKey;
    @Value("${google.api_key}")
    private String googleApiKey;

    @GetMapping("/profile-details")
    public String profileDetails(Model model) {
        model.addAttribute("turnstile", Map.of("sitekey", turnstileSiteKey));
        model.addAttribute("google", Map.of("api_key", googleApiKey));
        return "profile-details";
    }
}

