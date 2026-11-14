import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { isDyadProEnabled } from "@/lib/schemas";

export function ShellExperimentSwitch() {
  const { settings, updateSettings } = useSettings();
  const isPro = !!settings && isDyadProEnabled(settings);
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <Switch
          id="enable-shell-tool"
          aria-label="Shell tool (Pro)"
          checked={!!settings?.enableShellTool}
          disabled={!isPro}
          onCheckedChange={(checked) =>
            updateSettings({ enableShellTool: checked })
          }
        />
        <Label htmlFor="enable-shell-tool">Shell tool (Pro)</Label>
      </div>
      <div className="text-sm text-muted-foreground">
        Allow Agent mode to run Bash on macOS/Linux or PowerShell on Windows for
        app tasks and connected cloud services. Every command is reviewed using
        Pro credits. Enabling this experiment carries risk: commands run on your
        machine without filesystem isolation, and an AI safety review can make
        mistakes. Commands classified as safe run automatically unless you set
        run_shell consent to Ask. Consequential commands may require your
        approval; clear safety violations are blocked. Available only with the
        Host runtime.
      </div>
      <div className="flex items-start gap-2 pt-2">
        <Switch
          id="skip-shell-approval-prompts"
          aria-label="Skip shell command approval prompts"
          checked={!!settings?.skipShellApprovalPrompts}
          disabled={!isPro || !settings?.enableShellTool}
          onCheckedChange={(checked) =>
            updateSettings({ skipShellApprovalPrompts: checked })
          }
        />
        <div className="space-y-1">
          <Label htmlFor="skip-shell-approval-prompts">
            Skip shell command approval prompts
          </Label>
          <div className="text-sm text-destructive">
            Dangerous: host commands can access your files and tools. This skips
            execution approval only; safety blocks still apply.
          </div>
        </div>
      </div>
    </div>
  );
}
