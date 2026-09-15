package com.lykari.app.control;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class MotorControlUnitTest {

    @Test
    public void instagramYTiktokIgnoranTextoSueltoPeroConservanMarcasExplicitas() {
        assertTrue(Motor.usaSoloMarcasSensibles("com.instagram.android"));
        assertTrue(Motor.usaSoloMarcasSensibles("com.zhiliaoapp.musically"));
        assertFalse(Motor.usaSoloMarcasSensibles("org.telegram.messenger"));
    }
}
