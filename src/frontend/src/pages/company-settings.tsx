import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { API_URL, companiesAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  User,
  Mail,
  ArrowLeft,
  Trash2,
  Loader2,
  Save,
  Upload,
  ImageIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Member {
  id: string;
  user?: { id: string; name: string; email: string };
  name?: string; // fallback for old data
  email?: string;
  role?: string;
  userId?: string;
}

interface Company {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  ownerId: string;
  owner: Member;
  members: Member[];
}

export default function CompanySettingsPage() {
  const { companyId = "" } = useParams<{ companyId: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    newRole: string;
  } | null>(null);
  const { user } = useAuth(); // get current user from context

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setIsLoading(true);
        const response = await companiesAPI.getById(companyId);
        setCompany(response.data);
        setName(response.data.name);
        setDescription(response.data.description || "");
        // Find current user's role
        const member = response.data.members.find(
          (m: any) => m.userId === user?.id
        );
        setCurrentUserRole(
          member?.role || (response.data.ownerId === user?.id ? "EDITOR" : null)
        );
      } catch (error) {
        console.error("Failed to fetch company", error);
        setError("Failed to load company details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [companyId, user?.id]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsInviting(true);
      setError(null);
      await companiesAPI.addMember(companyId, email);

      const response = await companiesAPI.getById(companyId);
      setCompany(response.data);

      setEmail("");
      toast.success("Invitation sent successfully");
    } catch (error: any) {
      console.error("Failed to invite user", error);
      setError(
        error.response?.data?.message ||
          "Failed to invite user. Please try again."
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!company) return;

    try {
      await companiesAPI.removeMember(companyId, userId);

      const response = await companiesAPI.getById(companyId);
      setCompany(response.data);

      toast.success("Member removed successfully");
    } catch (error: any) {
      console.error("Failed to remove member", error);
      toast.error("Failed to remove member. Please try again.");
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Company name is required");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await companiesAPI.update(companyId, {
        name,
        description,
      });

      setCompany((prev) => (prev ? { ...prev, name, description } : null));
      toast.success("Company updated successfully");
    } catch (error) {
      console.error("Failed to update company", error);
      setError("Failed to update company. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedImage(file);

    try {
      setIsUploadingImage(true);
      setError(null);

      if (company?.imageUrl) {
        await companiesAPI.updateImage(companyId, file);
      } else {
        await companiesAPI.uploadImage(companyId, file);
      }

      const response = await companiesAPI.getById(companyId);
      setCompany(response.data);

      toast.success("Company logo updated successfully");
    } catch (error) {
      console.error("Failed to upload image", error);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      setSelectedImage(null);
    }
  };

  const handleImageDelete = async () => {
    if (!company?.imageUrl) return;

    try {
      setIsUploadingImage(true);
      setError(null);

      await companiesAPI.deleteImage(companyId);

      const response = await companiesAPI.getById(companyId);
      setCompany(response.data);

      toast.success("Company logo removed successfully");
    } catch (error) {
      console.error("Failed to delete image", error);
      setError("Failed to remove image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Update member role
  const handleRoleChange = async (userId: string, newRole: string) => {
    // Check if user is changing their own role
    if (userId === user?.id) {
      setPendingRoleChange({ userId, newRole });
      setIsRoleDialogOpen(true);
      return;
    }

    // Otherwise proceed with role change
    await updateMemberRole(userId, newRole);
  };

  // Function to execute the role change
  const updateMemberRole = async (userId: string, newRole: string) => {
    try {
      await companiesAPI.updateMemberRole(companyId, userId, newRole);

      // Reload company data to ensure all UI components are updated
      const response = await companiesAPI.getById(companyId);
      setCompany(response.data);

      // Update current user role if this is the current user
      if (userId === user?.id) {
        setCurrentUserRole(newRole);

        // If reducing own permissions, might need to reload the component
        // to apply new permission restrictions
        if (newRole === "READER" || newRole === "COMMENTER") {
          // Small delay to ensure the user sees the success message
          setTimeout(() => {
            // Force full refresh of the component
            setIsLoading(true);
            const refreshData = async () => {
              try {
                const refreshResponse = await companiesAPI.getById(companyId);
                setCompany(refreshResponse.data);
              } catch (error) {
                console.error("Failed to refresh data", error);
              } finally {
                setIsLoading(false);
              }
            };
            refreshData();
          }, 1000);
        }
      }

      toast.success("Role updated successfully");
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  // Function to confirm self role change
  const confirmRoleChange = () => {
    if (pendingRoleChange) {
      updateMemberRole(pendingRoleChange.userId, pendingRoleChange.newRole);
      setIsRoleDialogOpen(false);
      setPendingRoleChange(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center mb-6">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Company not found or you don't have access.</span>
        </div>
        <Link to="/">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Only owner or EDITOR can invite/remove/edit/upload/delete
  const canEditMembers =
    company && (company.ownerId === user?.id || currentUserRole === "EDITOR");
  const canEditCompany =
    company && (company.ownerId === user?.id || currentUserRole === "EDITOR");
  const canUploadLogo = canEditCompany;
  const canDeleteLogo = canEditCompany;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Toaster />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {company.imageUrl ? (
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={`${API_URL}${company.imageUrl}`}
                alt={company.name}
              />
              <AvatarFallback>{company.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-full">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{company.name} Settings</h1>
            <p className="text-muted-foreground">{company.description}</p>
          </div>
        </div>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="mb-6">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="space-y-6">
            {canEditMembers && (
              <Card>
                <CardHeader>
                  <CardTitle>Invite Members</CardTitle>
                  <CardDescription>
                    Invite team members to collaborate on projects in{" "}
                    {company.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInviteUser} className="space-y-4">
                    {error && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="colleague@example.com"
                          required
                        />
                        <Button type="submit" disabled={isInviting}>
                          {isInviting ? "Inviting..." : "Invite"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  People with access to {company.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {company.owner.name || company.owner.user?.name}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {company.owner.email || company.owner.user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-primary">
                      Owner
                    </div>
                  </div>

                  {company.members
                    .filter(
                      (member) =>
                        member.userId !== company.ownerId &&
                        member.id !== company.ownerId
                    )
                    .map((member) => (
                      <div
                        key={member.userId || member.id}
                        className="flex items-center justify-between p-3 bg-card border border-border rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-muted p-2 rounded-full">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.user?.name || member.name || "—"}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {member.user?.email || member.email || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role || "READER"}
                            disabled={!canEditMembers}
                            onValueChange={(value) =>
                              handleRoleChange(
                                member.userId || member.id,
                                value
                              )
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EDITOR">Editor</SelectItem>
                              <SelectItem value="COMMENTER">
                                Commenter
                              </SelectItem>
                              <SelectItem value="READER">Reader</SelectItem>
                            </SelectContent>
                          </Select>
                          {canEditMembers && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveMember(member.userId || member.id)
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                  {company.members.length <= 1 && (
                    <div className="text-center p-6 text-muted-foreground">
                      <p>No additional members yet</p>
                      {canEditMembers && (
                        <p className="text-sm mt-1">
                          Invite team members to collaborate
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Logo</CardTitle>
                <CardDescription>
                  Upload a logo for your company
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                    {error}
                  </div>
                )}

                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg mb-4">
                  {company.imageUrl ? (
                    <div className="flex flex-col items-center">
                      <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage
                          src={company.imageUrl}
                          alt={company.name}
                        />
                        <AvatarFallback>
                          {company.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!canUploadLogo || isUploadingImage}
                        >
                          {isUploadingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Change Logo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleImageDelete}
                          disabled={!canDeleteLogo || isUploadingImage}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="h-24 w-24 bg-muted flex items-center justify-center rounded-full mb-4">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canUploadLogo || isUploadingImage}
                      >
                        {isUploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Logo
                      </Button>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={canUploadLogo ? handleImageUpload : undefined}
                    disabled={!canUploadLogo}
                  />
                  <p className="text-xs text-muted-foreground mt-4">
                    Recommended: Square image, at least 128x128px. PNG or JPG
                    format.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleUpdateCompany} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter company name"
                      disabled={!canEditCompany}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter company description"
                      rows={4}
                      disabled={!canEditCompany}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!canEditCompany || isSaving}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Role change confirmation dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
            <DialogDescription>
              You are changing your own role to {pendingRoleChange?.newRole}.
              This may affect your permissions in this company. Are you sure you
              want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmRoleChange}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
