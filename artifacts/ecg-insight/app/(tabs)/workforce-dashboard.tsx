import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  createContractorCompany,
  createCompany,
  createDepartment,
  createEmployee,
  createWorkforceOrganization,
  deleteContractorCompany,
  deleteCompany,
  deleteDepartment,
  deleteEmployee,
  deleteWorkforceOrganization,
  listContractorCompanies,
  listCompanies,
  listDepartments,
  listEmployees,
  listWorkforceOrganizations,
  updateEmployee,
  type ContractorCompany,
  type Employee,
  type WorkforceCompany,
  type WorkforceDepartment,
  type WorkforceOrganization,
} from "@/services/workforce";

export default function WorkforceDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Workforce Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Organizations, departments, contractors, employees, and clinical employment status.
        </Text>

        <WorkflowCrudPanel<WorkforceOrganization>
          createFields={[
            { key: "name", label: "Name" },
            { key: "type", label: "Type" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
          ]}
          createItem={(input) =>
            createWorkforceOrganization(authToken!.token, {
              email: input.email,
              name: input.name,
              phone: input.phone,
              status: "active",
              type: input.type || "hospital",
            })
          }
          deleteItem={(id) => deleteWorkforceOrganization(authToken!.token, id)}
          detailText={(organization) => `${organization.type} · ${organization.status} · ${organization.email ?? "No email"}`}
          emptyText="No organizations match the current search and filters."
          filters={[{ key: "status", label: "Status", options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ] }]}
          itemsFromResponse={(response) => (response as { organizations?: WorkforceOrganization[] } | undefined)?.organizations ?? []}
          listItems={(params) => listWorkforceOrganizations(authToken!.token, params)}
          queryKey={["workforce-organizations", authToken?.token]}
          searchPlaceholder="Search organizations"
          subtitle="Create, inspect, and deactivate organizations."
          title="Organizations"
          titleForItem={(organization) => organization.name}
        />

        <WorkflowCrudPanel<WorkforceCompany>
          createFields={[
            { key: "name", label: "Company name" },
            { key: "organizationId", label: "Organization ID" },
            { key: "registrationNumber", label: "Registration number" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
          ]}
          createItem={(input) =>
            createCompany(authToken!.token, {
              email: input.email,
              name: input.name,
              organizationId: input.organizationId,
              phone: input.phone,
              registrationNumber: input.registrationNumber,
              status: "active",
            })
          }
          deleteItem={(id) => deleteCompany(authToken!.token, id)}
          detailText={(company) => `${company.status} · Org ${company.organizationId} · ${company.registrationNumber ?? "No registration"}`}
          emptyText="No companies match the current search and filters."
          filters={[{ key: "status", label: "Status", options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ] }]}
          itemsFromResponse={(response) => (response as { companies?: WorkforceCompany[] } | undefined)?.companies ?? []}
          listItems={(params) => listCompanies(authToken!.token, params)}
          queryKey={["workforce-companies", authToken?.token]}
          searchPlaceholder="Search companies"
          subtitle="Create and manage companies beneath enterprise organizations."
          title="Companies"
          titleForItem={(company) => company.name}
        />

        <WorkflowCrudPanel<WorkforceDepartment>
          createFields={[
            { key: "name", label: "Name" },
            { key: "organizationId", label: "Organization ID" },
            { key: "companyId", label: "Company ID" },
          ]}
          createItem={(input) => createDepartment(authToken!.token, { companyId: input.companyId, name: input.name, organizationId: input.organizationId })}
          deleteItem={(id) => deleteDepartment(authToken!.token, id)}
          detailText={(department) => `Organization ${department.organizationId}`}
          emptyText="No departments match the current search and filters."
          itemsFromResponse={(response) => (response as { departments?: WorkforceDepartment[] } | undefined)?.departments ?? []}
          listItems={(params) => listDepartments(authToken!.token, params)}
          queryKey={["workforce-departments", authToken?.token]}
          searchPlaceholder="Search departments"
          subtitle="Create, inspect, and delete departments."
          title="Departments"
          titleForItem={(department) => department.name}
        />

        <WorkflowCrudPanel<ContractorCompany>
          createFields={[
            { key: "name", label: "Name" },
            { key: "organizationId", label: "Organization ID" },
            { key: "companyId", label: "Company ID" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
          ]}
          createItem={(input) =>
            createContractorCompany(authToken!.token, {
              email: input.email,
              companyId: input.companyId,
              name: input.name,
              organizationId: input.organizationId,
              phone: input.phone,
              status: "active",
            })
          }
          deleteItem={(id) => deleteContractorCompany(authToken!.token, id)}
          detailText={(contractor) => `${contractor.status} · ${contractor.email ?? "No email"} · Org ${contractor.organizationId}`}
          emptyText="No contractors match the current search and filters."
          filters={[{ key: "status", label: "Status", options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ] }]}
          itemsFromResponse={(response) => (response as { contractors?: ContractorCompany[] } | undefined)?.contractors ?? []}
          listItems={(params) => listContractorCompanies(authToken!.token, params)}
          queryKey={["workforce-contractors", authToken?.token]}
          searchPlaceholder="Search contractors"
          subtitle="Create, inspect, and deactivate contractor companies."
          title="Contractors"
          titleForItem={(contractor) => contractor.name}
        />

        <WorkflowCrudPanel<Employee>
          createFields={[
            { key: "fullName", label: "Full name" },
            { key: "employeeId", label: "Employee ID" },
            { key: "nationalId", label: "National ID" },
            { key: "organizationId", label: "Organization ID" },
            { key: "companyId", label: "Company ID" },
            { key: "departmentId", label: "Department ID" },
            { key: "contractorCompanyId", label: "Contractor ID" },
            { key: "dateOfBirth", label: "Date of birth", placeholder: "YYYY-MM-DD" },
            { key: "gender", label: "Gender", placeholder: "male, female, other, or unknown" },
            { key: "jobTitle", label: "Job title" },
            { key: "workLocation", label: "Work location" },
            { key: "riskCategory", label: "Risk category" },
            { key: "medicalRestrictions", label: "Medical restrictions", placeholder: "Comma-separated restrictions" },
            { key: "email", label: "Email" },
          ]}
          createItem={(input) =>
            createEmployee(authToken!.token, {
              dateOfBirth: input.dateOfBirth,
              companyId: input.companyId,
              contractorCompanyId: input.contractorCompanyId,
              departmentId: input.departmentId,
              email: input.email,
              employeeId: input.employeeId,
              employmentStatus: "active",
              fullName: input.fullName,
              gender: (input.gender || "unknown") as Employee["gender"],
              jobTitle: input.jobTitle,
              medicalRestrictions: input.medicalRestrictions ? input.medicalRestrictions.split(",").map((item) => item.trim()).filter(Boolean) : [],
              medicalFitnessStatus: "unknown",
              nationalId: input.nationalId,
              organizationId: input.organizationId,
              riskCategory: input.riskCategory,
              workLocation: input.workLocation,
            })
          }
          deleteItem={(id) => deleteEmployee(authToken!.token, id)}
          detailText={(employee) => `${employee.employmentStatus} · ${employee.medicalFitnessStatus} · ${employee.jobTitle ?? "No job title"}`}
          emptyText="No employees match the current search and filters."
          filters={[{ key: "employmentStatus", label: "Status", options: [
            { label: "Active", value: "active" },
            { label: "On leave", value: "on_leave" },
            { label: "Terminated", value: "terminated" },
          ] }]}
          itemsFromResponse={(response) => (response as { employees?: Employee[] } | undefined)?.employees ?? []}
          listItems={(params) => listEmployees(authToken!.token, params)}
          queryKey={["workforce-employees", authToken?.token]}
          searchPlaceholder="Search employees by name, ID, department, or fitness status"
          subtitle="Create, edit, inspect, and terminate employees."
          title="Employees"
          titleForItem={(employee) => employee.fullName}
          updateFields={[
            { key: "fullName", label: "Full name" },
            { key: "jobTitle", label: "Job title" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "employmentStatus", label: "Employment status" },
            { key: "medicalFitnessStatus", label: "Medical fitness status" },
            { key: "workLocation", label: "Work location" },
            { key: "riskCategory", label: "Risk category" },
          ]}
          updateItem={(id, input) => updateEmployee(authToken!.token, id, input)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
