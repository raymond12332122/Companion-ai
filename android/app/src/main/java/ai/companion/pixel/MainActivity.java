package ai.companion.pixel;

import android.os.Bundle;
import ai.companion.pixel.llm.CompanionLocalLlmPlugin;
import ai.companion.pixel.gemma.GemmaPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CompanionLocalLlmPlugin.class);
        registerPlugin(GemmaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
