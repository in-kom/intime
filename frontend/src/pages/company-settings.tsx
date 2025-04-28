import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { companiesAPI } from "@/lib/api";
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
import { AlertCircle, User, Mail, ArrowLeft, Trash2, Loader2, Save } from "lucide-react";
import { toast, Toaster } from "sonner";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Company {
  id: string;
  name: string;
  description?: string;
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

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setIsLoading(true);
        const response = await companiesAPI.getById(companyId);
        setCompany(response.data);
        setName(response.data.name);
        setDescription(response.data.description || "");
      } catch (error) {
        console.error("Failed to fetch company", error);
        setError("Failed to load company details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsInviting(true);
      setError(null);
      await companiesAPI.addMember(companyId, email);

      // Refresh company data
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

      // Refresh company data
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

      // Update the local state with the new values
      setCompany((prev) => (prev ? { ...prev, name, description } : null));
      toast.success("Company updated successfully");
    } catch (error) {
      console.error("Failed to update company", error);
      setError("Failed to update company. Please try again.");
    } finally {
      setIsSaving(false);
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

  const isOwner = company.ownerId === company.owner.id;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Toaster />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{company.name} Settings</h1>
          <p className="text-muted-foreground">{company.description}</p>
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
            {isOwner && (
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
                  {/* Owner */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{company.owner.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {company.owner.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-primary">
                      Owner
                    </div>
                  </div>

                  {/* Members */}
                  {company.members
                    .filter((member) => member.id !== company.ownerId)
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-card border border-border rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-muted p-2 rounded-full">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {member.email}
                            </p>
                          </div>
                        </div>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                  {company.members.length <= 1 && (
                    <div className="text-center p-6 text-muted-foreground">
                      <p>No additional members yet</p>
                      {isOwner && (
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
                  />
                </div>

                <Button type="submit" disabled={isSaving} className="w-full">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
