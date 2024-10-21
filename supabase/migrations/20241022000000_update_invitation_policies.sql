-- Create a function to handle the invitation acceptance process
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_organization_id UUID;
    v_role TEXT;
BEGIN
    -- Get invitation details
    SELECT organization_id, role INTO v_organization_id, v_role
    FROM public.invitations
    WHERE id = p_invitation_id;

    -- Update user
    UPDATE public.users
    SET organization_id = v_organization_id, role = v_role
    WHERE id = p_user_id;

    -- Delete the invitation
    DELETE FROM public.invitations WHERE id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;