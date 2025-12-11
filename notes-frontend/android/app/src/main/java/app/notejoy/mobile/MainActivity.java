package app.notejoy.mobile;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // ⚙️ Cho phép truy cập HTTP và Mixed Content (fix lỗi ERR_CLEARTEXT_NOT_PERMITTED)
    WebSettings webSettings = getBridge().getWebView().getSettings();
    webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
  }
}
