import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocations } from "@/hooks/use-locations";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSettings, NotificationSettingsResponse } from "@/hooks/use-notification-settings";
import { useExport } from "@/hooks/use-export";
import { useImport, ImportMode } from "@/hooks/use-import";
import { 
  Loader2, 
  PencilIcon, 
  Trash2Icon, 
  PlusIcon, 
  SaveIcon, 
  XIcon, 
  Bell, 
  BellOff,
  CheckCircle, 
  AlertCircle,
  BellRing,
  Download,
  Upload,
  Shield,
  FileUp,
  RefreshCw
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { toast } = useToast();
  const { locations, isLoading, createLocation, updateLocation, deleteLocation } = useLocations();
  const { 
    settings, 
    isLoading: isLoadingSettings, 
    updateSettings, 
    isUpdating,
    testNotification,
    isTesting,
    testSuccess
  } = useNotificationSettings();
  
  const { exportData, isExporting } = useExport();
  const { importData, isImporting } = useImport();

  const [newLocation, setNewLocation] = useState("");
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string } | null>(null);
  const [pushoverAppToken, setPushoverAppToken] = useState("");
  const [pushoverUserKey, setPushoverUserKey] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [sendgridApiKey, setSendgridApiKey] = useState("");
  
  // Import-related state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false);
  const [replaceConfirmationText, setReplaceConfirmationText] = useState("");
  
  const notificationSettings = settings as NotificationSettingsResponse;

  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast({
        title: "Error",
        description: "Location name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    createLocation.mutate(
      { name: newLocation.trim() },
      {
        onSuccess: () => {
          toast({
            title: "Location added",
            description: "New location has been added successfully.",
          });
          setNewLocation("");
        },
        onError: (error: any) => {
          toast({
            title: "Failed to add location",
            description: error?.message || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleEditLocation = (id: number, name: string) => {
    setEditingLocation({ id, name });
  };

  const handleSaveEdit = () => {
    if (!editingLocation) return;
    
    if (!editingLocation.name.trim()) {
      toast({
        title: "Error",
        description: "Location name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateLocation.mutate(
      { 
        id: editingLocation.id, 
        data: { name: editingLocation.name.trim() } 
      },
      {
        onSuccess: () => {
          toast({
            title: "Location updated",
            description: "Location has been updated successfully.",
          });
          setEditingLocation(null);
        },
        onError: (error: any) => {
          toast({
            title: "Failed to update location",
            description: error?.message || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingLocation(null);
  };

  const handleDeleteLocation = (id: number) => {
    deleteLocation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Location deleted",
          description: "Location has been removed successfully.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete location",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast({
          title: "Invalid file type",
          description: "Please select a ZIP backup file.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a backup file to import.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog for destructive replace mode
    if (importMode === 'replace') {
      setShowReplaceConfirmation(true);
      setReplaceConfirmationText("");
      return;
    }

    // Proceed with merge mode directly
    performImport();
  };

  const performImport = (confirmation?: string) => {
    if (!selectedFile) return;

    const importParams: { file: File; mode: ImportMode; confirmation?: string } = {
      file: selectedFile,
      mode: importMode
    };

    // Add confirmation for replace mode
    if (importMode === 'replace') {
      importParams.confirmation = confirmation || replaceConfirmationText;
    }

    importData(importParams, {
      onSuccess: () => {
        setSelectedFile(null);
        setShowReplaceConfirmation(false);
        setReplaceConfirmationText("");
        // Reset file input
        const fileInput = document.getElementById('backup-file-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      onError: () => {
        // Keep dialog open on error so user can try again
        if (importMode === 'replace') {
          setReplaceConfirmationText("");
        }
      },
    });
  };

  const handleConfirmedReplace = () => {
    if (replaceConfirmationText !== "REPLACE") {
      toast({
        title: "Confirmation required",
        description: "You must type 'REPLACE' exactly to confirm this destructive operation.",
        variant: "destructive",
      });
      return;
    }

    setShowReplaceConfirmation(false);
    performImport("REPLACE");
  };

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Settings</h1>
        <p className="text-muted-foreground">Customize your plant care preferences</p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 font-heading">Appearance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Customize the look and feel of PlantDaddy.
        </p>
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Dark Mode</h3>
                <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold mb-3 font-heading">Data Backup & Restore</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Export a complete backup of your plant data including images, locations, watering history, and settings. You can also restore data from a previous backup.
        </p>
        
        {/* Export Section */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Export Plant Data</h3>
                <p className="text-sm text-muted-foreground">
                  Download a complete backup of all your plant data as a ZIP file.
                </p>
              </div>
              <Button 
                onClick={() => exportData()}
                disabled={isExporting}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-export-backup"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? "Exporting..." : "Export Backup"}
              </Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Includes plants, locations, watering history, and notification settings</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restore Section */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="mb-4">
              <h3 className="font-medium mb-2">Restore Plant Data</h3>
              <p className="text-sm text-muted-foreground">
                Upload a backup ZIP file to restore your plant data. Choose your restore mode carefully.
              </p>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="backup-file-input" className="text-sm font-medium">
                  Backup File
                </Label>
                <div className="mt-1 flex items-center gap-3">
                  <Input
                    id="backup-file-input"
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                    className="flex-1"
                    data-testid="input-backup-file"
                  />
                  {selectedFile && (
                    <div className="text-green-500 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs">{selectedFile.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Import Mode Selection */}
              <div>
                <Label className="text-sm font-medium">Restore Mode</Label>
                <Select 
                  value={importMode} 
                  onValueChange={(value: ImportMode) => setImportMode(value)}
                  disabled={isImporting}
                >
                  <SelectTrigger className="mt-1" data-testid="select-import-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">
                      Merge - Add to existing data (recommended)
                    </SelectItem>
                    <SelectItem value="replace">
                      Replace - Delete all current data and restore from backup
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {importMode === 'merge' 
                    ? "Safely adds backup data to your existing plants and locations"
                    : "⚠️ Warning: This will permanently delete all your current data"
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleImport}
                  disabled={isImporting || !selectedFile}
                  className="flex items-center gap-2"
                  data-testid="button-restore-backup"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : importMode === 'replace' ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isImporting ? "Restoring..." : importMode === 'replace' ? "Replace All Data" : "Merge Data"}
                </Button>
                
                {selectedFile && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      const fileInput = document.getElementById('backup-file-input') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    disabled={isImporting}
                    data-testid="button-clear-file"
                  >
                    Clear File
                  </Button>
                )}
              </div>

              {/* Warning for Replace Mode */}
              {importMode === 'replace' && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-300">Destructive Action</h4>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        Replace mode will permanently delete all your current plants, locations, and watering history. 
                        This action cannot be undone. Consider using Merge mode instead.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold mb-3 font-heading">Locations</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Manage the locations where you keep your plants.
        </p>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center mb-4">
              <Input
                placeholder="Add a new location..."
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="mr-2"
              />
              <Button 
                onClick={handleAddLocation} 
                disabled={createLocation.isPending || !newLocation.trim()}
                className="bg-primary text-white"
              >
                {createLocation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusIcon className="h-4 w-4" />
                )}
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : locations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No custom locations added yet.</p>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between py-2 px-3 border-b border-border last:border-0"
                  >
                    {editingLocation && editingLocation.id === location.id ? (
                      <div className="flex-1 flex items-center">
                        <Input
                          value={editingLocation.name}
                          onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                          className="mr-2"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          className="text-green-600 mr-1"
                          disabled={updateLocation.isPending}
                        >
                          {updateLocation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SaveIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="text-muted-foreground"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium flex-1">
                          {location.name}
                          {location.isDefault === true && (
                            <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                          )}
                        </span>
                        <div className="flex items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditLocation(location.id, location.name)}
                            className="text-muted-foreground"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                disabled={deleteLocation.isPending}
                              >
                                {deleteLocation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2Icon className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{location.name}"? This action cannot be undone. 
                                  Locations that are being used by plants cannot be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteLocation(location.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 font-heading">Notifications</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure your watering reminders and notifications.
        </p>
        <Card className="mb-4">
          <CardContent className="p-4">
            {isLoadingSettings ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="font-medium flex items-center">
                      {notificationSettings?.enabled ? (
                        <Bell className="h-5 w-5 mr-2 text-primary" />
                      ) : (
                        <BellOff className="h-5 w-5 mr-2 text-muted-foreground" />
                      )}
                      Watering Notifications
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when your plants need watering.
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings?.enabled ?? false}
                    onCheckedChange={(checked) => {
                      updateSettings({ enabled: checked });
                      toast({
                        title: checked ? "Notifications enabled" : "Notifications disabled",
                        description: checked
                          ? "You will receive watering reminders for your plants."
                          : "You will no longer receive watering reminders.",
                      });
                    }}
                    disabled={isUpdating}
                  />
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Pushover Credentials</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    PlantDaddy uses Pushover to send notifications to your devices. You'll need to provide your Pushover credentials to receive notifications.
                  </p>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pushover-app-token">Pushover App Token</Label>
                      <div className="flex items-center">
                        <Input
                          id="pushover-app-token"
                          type="password"
                          value={pushoverAppToken}
                          onChange={(e) => setPushoverAppToken(e.target.value)}
                          placeholder={notificationSettings?.pushoverAppToken ? "••••••••••••••••••••••••••••••" : "Enter your Pushover App Token"}
                          className="mr-2"
                        />
                        {notificationSettings?.pushoverAppToken && (
                          <div className="text-green-500 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Configured</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pushover-user-key">Pushover User Key</Label>
                      <div className="flex items-center">
                        <Input
                          id="pushover-user-key"
                          type="password"
                          value={pushoverUserKey}
                          onChange={(e) => setPushoverUserKey(e.target.value)}
                          placeholder={notificationSettings?.pushoverUserKey ? "••••••••••••••••••••••••••••••" : "Enter your Pushover User Key"}
                          className="mr-2"
                        />
                        {notificationSettings?.pushoverUserKey && (
                          <div className="text-green-500 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Configured</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button 
                        onClick={() => {
                          const updates: any = {};
                          if (pushoverAppToken) updates.pushoverAppToken = pushoverAppToken;
                          if (pushoverUserKey) updates.pushoverUserKey = pushoverUserKey;
                          
                          if (Object.keys(updates).length === 0) {
                            toast({
                              title: "No changes to save",
                              description: "Please enter your Pushover credentials.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Enable Pushover notifications when credentials are saved
                          updates.pushoverEnabled = true;
                          
                          updateSettings(updates);
                          toast({
                            title: "Credentials saved",
                            description: "Your Pushover credentials have been saved.",
                          });
                          
                          // Clear input fields after saving
                          setPushoverAppToken("");
                          setPushoverUserKey("");
                        }}
                        disabled={isUpdating || (!pushoverAppToken && !pushoverUserKey)}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <SaveIcon className="h-4 w-4 mr-2" />
                        )}
                        Save Credentials
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          testNotification();
                          toast({
                            title: "Sending test notification",
                            description: "Check your device for the test notification.",
                          });
                        }}
                        disabled={isTesting || !notificationSettings?.pushoverAppToken || !notificationSettings?.pushoverUserKey || !notificationSettings?.enabled}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <BellRing className="h-4 w-4 mr-2" />
                        )}
                        Test Notification
                      </Button>
                    </div>
                    
                    {notificationSettings?.enabled && (!notificationSettings.pushoverAppToken || !notificationSettings.pushoverUserKey) && !notificationSettings.emailEnabled && (
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                          <div>
                            <h4 className="font-medium text-amber-800 dark:text-amber-300">Credentials Required</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              Please enter your Pushover credentials to receive notifications, or set up Email notifications below.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 border-t pt-6">
                  <div className="flex items-center justify-between py-2 mb-3">
                    <div>
                      <h4 className="font-medium flex items-center">
                        Email Notifications
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Receive watering reminders via email instead of Pushover.
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings?.emailEnabled ?? false}
                      onCheckedChange={(checked) => {
                        updateSettings({ emailEnabled: checked });
                        toast({
                          title: checked ? "Email notifications enabled" : "Email notifications disabled",
                          description: checked
                            ? "You will receive watering reminders via email."
                            : "You will no longer receive email notifications.",
                        });
                      }}
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email-address">Email Address</Label>
                      <div className="flex items-center">
                        <Input
                          id="email-address"
                          type="email"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          placeholder={notificationSettings?.emailAddress || "Enter your email address"}
                          className="mr-2"
                        />
                        {notificationSettings?.emailAddress && (
                          <div className="text-green-500 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Configured</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="sendgrid-api-key">SendGrid API Key</Label>
                      <div className="flex items-center">
                        <Input
                          id="sendgrid-api-key"
                          type="password"
                          value={sendgridApiKey}
                          onChange={(e) => setSendgridApiKey(e.target.value)}
                          placeholder={notificationSettings?.sendgridApiKey ? "••••••••••••••••••••••••••••••" : "Enter your SendGrid API Key"}
                          className="mr-2"
                        />
                        {notificationSettings?.sendgridApiKey && (
                          <div className="text-green-500 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Configured</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button 
                        onClick={() => {
                          const updates: any = {};
                          if (emailAddress) updates.emailAddress = emailAddress;
                          if (sendgridApiKey) updates.sendgridApiKey = sendgridApiKey;
                          
                          if (Object.keys(updates).length === 0) {
                            toast({
                              title: "No changes to save",
                              description: "Please enter your email settings.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Enable email notifications when credentials are saved
                          updates.emailEnabled = true;
                          
                          updateSettings(updates);
                          toast({
                            title: "Email settings saved",
                            description: "Your email notification settings have been saved.",
                          });
                          
                          // Clear input fields after saving
                          setEmailAddress("");
                          setSendgridApiKey("");
                        }}
                        disabled={isUpdating || (!emailAddress && !sendgridApiKey)}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <SaveIcon className="h-4 w-4 mr-2" />
                        )}
                        Save Email Settings
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          testNotification();
                          toast({
                            title: "Sending test email",
                            description: "Check your inbox for the test email notification.",
                          });
                        }}
                        disabled={isTesting || !notificationSettings?.emailAddress || !notificationSettings?.sendgridApiKey || !notificationSettings?.emailEnabled || !notificationSettings?.enabled}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <BellRing className="h-4 w-4 mr-2" />
                        )}
                        Test Email
                      </Button>
                    </div>
                    
                    {notificationSettings?.enabled && notificationSettings?.emailEnabled && (!notificationSettings.emailAddress || !notificationSettings.sendgridApiKey) && (
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                          <div>
                            <h4 className="font-medium text-amber-800 dark:text-amber-300">Email Settings Required</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              Please enter your email address and SendGrid API key to receive email notifications.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 font-heading">About PlantDaddy</h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-foreground mb-2">Version 1.0.0</p>
            <p className="text-muted-foreground text-sm">
              PlantDaddy helps you track and manage your houseplants, ensuring they get watered on time.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Replace Mode Confirmation Dialog */}
      <AlertDialog open={showReplaceConfirmation} onOpenChange={setShowReplaceConfirmation}>
        <AlertDialogContent data-testid="dialog-replace-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Confirm Destructive Operation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to <strong>permanently delete all your current plant data</strong> and replace it with data from the backup file.
              </p>
              <p className="text-sm">
                This will remove:
              </p>
              <ul className="text-sm list-disc list-inside ml-4 space-y-1">
                <li>All your current plants and their photos</li>
                <li>All watering history records</li>
                <li>All custom locations</li>
                <li>All notification settings</li>
              </ul>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  ⚠️ This action cannot be undone!
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  To proceed, type <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">REPLACE</code> in the field below:
                </p>
                <Input
                  type="text"
                  value={replaceConfirmationText}
                  onChange={(e) => setReplaceConfirmationText(e.target.value)}
                  placeholder="Type REPLACE to confirm"
                  className="font-mono"
                  data-testid="input-replace-confirmation"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowReplaceConfirmation(false);
                setReplaceConfirmationText("");
              }}
              data-testid="button-cancel-replace"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedReplace}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              disabled={replaceConfirmationText !== "REPLACE"}
              data-testid="button-confirm-replace"
            >
              {replaceConfirmationText !== "REPLACE" ? "Type REPLACE to enable" : "Replace All Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}