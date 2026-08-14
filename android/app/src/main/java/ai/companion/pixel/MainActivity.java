package ai.companion.pixel;

import android.os.Bundle;
import ai.companion.pixel.llm.CompanionLocalLlmPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CompanionLocalLlmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
