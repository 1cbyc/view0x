import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound: React.FC = () => (
  <div className="container mx-auto max-w-lg px-4 py-16">
    <Card>
      <CardContent className="py-10 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This URL does not match any page in view0x.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/">Scanner</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default NotFound;
